const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Banco } = require('./src/banco');
const { prepararCadastro } = require('./src/validacao');
const { criarCadeia } = require('./src/cadeia');

const arquivosPublicos = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/index.html': ['index.html', 'text/html; charset=utf-8'],
    '/cadastro.html': ['cadastro.html', 'text/html; charset=utf-8'],
    '/listar.html': ['listar.html', 'text/html; charset=utf-8'],
    '/acesso.html': ['acesso.html', 'text/html; charset=utf-8'],
    '/estilo.css': ['estilo.css', 'text/css; charset=utf-8'],
    '/site.js': ['site.js', 'text/javascript; charset=utf-8']
};

function responder(res, status, dados) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(dados));
}

async function lerJson(req) {
    let texto = '';
    for await (const parte of req) {
        texto += parte.toString('utf8');
        if (texto.length > 65000) {
            const erro = new Error('O conteúdo enviado é muito grande.');
            erro.status = 413;
            throw erro;
        }
    }
    try {
        const dado = JSON.parse(texto);
        if (!dado || typeof dado !== 'object' || Array.isArray(dado)) throw new Error();
        return dado;
    } catch {
        const erro = new Error('Envie um JSON válido.');
        erro.status = 400;
        throw erro;
    }
}

async function buscarCepExterno(cep) {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        signal: AbortSignal.timeout(5000)
    });
    if (!resposta.ok) throw new Error('ViaCEP indisponível');
    return resposta.json();
}

function criarServidor({ banco = new Banco(), consultarCep = buscarCepExterno } = {}) {
    const cadeia = criarCadeia(banco);

    const servidor = http.createServer(async (req, res) => {
        try {
            const url = new URL(req.url, 'http://localhost');
            const rota = url.pathname;
            const metodo = req.method;

            // Listar os cadastros
            if (rota === '/api/alunos' && metodo === 'GET') {
                return responder(res, 200, banco.listar());
            }

            // Cadastrar um aluno
            if (rota === '/api/alunos' && metodo === 'POST') {
                const dados = await lerJson(req);
                const resultado = prepararCadastro(dados);
                if (resultado.erro) return responder(res, 400, { erro: resultado.erro });
                if (banco.buscarPorEmail(resultado.aluno.email)) {
                    return responder(res, 409, { erro: 'E-mail já cadastrado.' });
                }
                const novo = banco.cadastrar(resultado.aluno);
                return responder(res, 201, novo);
            }

            const alunoRota = rota.match(/^\/api\/alunos\/(\d+)$/);
            if (alunoRota) {
                const id = Number(alunoRota[1]);
                const existente = banco.buscar(id);
                if (!existente) return responder(res, 404, { erro: 'Aluno não encontrado.' });

                if (metodo === 'GET') return responder(res, 200, existente);
                if (metodo === 'DELETE') {
                    banco.remover(id);
                    res.writeHead(204);
                    return res.end();
                }
                if (metodo === 'PUT') {
                    const dados = await lerJson(req);
                    const anterior = banco.buscarPorEmail(existente.email);
                    const resultado = prepararCadastro(dados, anterior);
                    if (resultado.erro) return responder(res, 400, { erro: resultado.erro });
                    const outro = banco.buscarPorEmail(resultado.aluno.email);
                    if (outro && outro.id !== id) return responder(res, 409, { erro: 'E-mail já cadastrado.' });
                    return responder(res, 200, banco.atualizar(id, resultado.aluno));
                }
                return responder(res, 405, { erro: 'Método não permitido.' });
            }

            // O controle de acesso passa pelos manipuladores da cadeia.
            if (rota === '/api/acesso' && metodo === 'POST') {
                const dados = await lerJson(req);
                const pedido = {
                    email: String(dados.email ?? '').trim().toLowerCase(),
                    codigo: String(dados.codigo ?? '').trim()
                };
                const resultado = cadeia.verificar(pedido);
                return responder(res, resultado.autorizado ? 200 : 403, resultado);
            }

            // ViaCEP passa pelo servidor para tratar falhas e CEP invalido.
            const cepRota = rota.match(/^\/api\/cep\/(.+)$/);
            if (cepRota && metodo === 'GET') {
                const cep = cepRota[1].replace(/\D/g, '');
                if (!/^\d{8}$/.test(cep)) return responder(res, 400, { erro: 'CEP inválido.' });
                try {
                    const resultado = await consultarCep(cep);
                    if (resultado.erro) return responder(res, 404, { erro: 'CEP não encontrado.' });
                    return responder(res, 200, {
                        cep, logradouro: resultado.logradouro || '', bairro: resultado.bairro || '',
                        cidade: resultado.localidade || '', uf: resultado.uf || ''
                    });
                } catch {
                    return responder(res, 502, { erro: 'Não foi possível consultar o ViaCEP. Preencha o endereço manualmente.' });
                }
            }

            if (rota.startsWith('/api/')) {
                return responder(res, 404, { erro: 'Rota da API não encontrada.' });
            }

            // Servir somente os arquivos de front-end conhecidos.
            if (metodo === 'GET' && arquivosPublicos[rota]) {
                const [arquivo, tipo] = arquivosPublicos[rota];
                const conteudo = await fs.readFile(path.join(__dirname, 'public', arquivo));
                res.writeHead(200, { 'Content-Type': tipo });
                return res.end(conteudo);
            }
            return responder(res, 404, { erro: 'Página não encontrada.' });
        } catch (erro) {
            console.error('Erro:', erro.message);
            return responder(res, erro.status || 500, { erro: erro.status ? erro.message : 'Erro interno no servidor.' });
        }
    });
    return { servidor, banco };
}

if (require.main === module) {
    const porta = Number(process.env.PORT) || 3000;
    const { servidor } = criarServidor();
    servidor.listen(porta, () => console.log(`Servidor iniciado em http://localhost:${porta}`));
}

module.exports = { criarServidor };
