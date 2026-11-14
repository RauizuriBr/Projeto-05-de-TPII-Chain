// Front-end: todas as requisicoes HTTP usam fetch().
async function requisicao(rota, opcoes = {}) {
    const resposta = await fetch(rota, {
        ...opcoes,
        headers: { 'Content-Type': 'application/json', ...(opcoes.headers || {}) }
    });
    const dados = resposta.status === 204 ? null : await resposta.json();
    if (!resposta.ok) throw new Error(dados?.erro || dados?.mensagem || 'Falha na comunicação.');
    return dados;
}

function mostrarMensagem(elemento, texto, tipo = '') {
    elemento.textContent = texto;
    elemento.className = `mensagem ${tipo}`;
}

function campo(form, nome) {
    return form.elements.namedItem(nome);
}

async function iniciarHome() {
    try {
        const lista = await requisicao('/api/alunos');
        document.querySelector('#totalAlunos').textContent = lista.length;
        document.querySelector('#totalAtivos').textContent = lista.filter(a => a.situacao === 'Ativo').length;
        document.querySelector('#totalInativos').textContent = lista.filter(a => a.situacao === 'Inativo').length;
    } catch {
        document.querySelector('#totalAlunos').textContent = 'Erro';
    }
}

async function iniciarCadastro() {
    const form = document.querySelector('#formCadastro');
    const aviso = document.querySelector('#mensagemCadastro');
    const id = new URLSearchParams(location.search).get('id');
    if (id) {
        document.querySelector('#tituloFormulario').textContent = 'Editar participante';
        document.querySelector('#ajudaCodigo').textContent = 'Deixe o código em branco para manter o atual.';
        try {
            const aluno = await requisicao(`/api/alunos/${encodeURIComponent(id)}`);
            for (const [chave, valor] of Object.entries(aluno)) {
                if (campo(form, chave)) campo(form, chave).value = valor;
            }
        } catch (erro) {
            mostrarMensagem(aviso, erro.message, 'erro');
            form.querySelector('button[type=submit]').disabled = true;
        }
    } else {
        campo(form, 'codigo').required = true;
    }

    document.querySelector('#buscarCep').addEventListener('click', async () => {
        const cep = campo(form, 'cep').value.replace(/\D/g, '');
        if (!/^\d{8}$/.test(cep)) return mostrarMensagem(aviso, 'Digite um CEP com 8 números.', 'erro');
        mostrarMensagem(aviso, 'Consultando CEP...');
        try {
            const endereco = await requisicao(`/api/cep/${cep}`);
            for (const chave of ['logradouro', 'bairro', 'cidade', 'uf']) {
                campo(form, chave).value = endereco[chave];
            }
            mostrarMensagem(aviso, 'Endereço encontrado. Complete o número e revise os dados.', 'sucesso');
        } catch (erro) {
            mostrarMensagem(aviso, `${erro.message} Você pode preencher manualmente.`, 'erro');
        }
    });

    form.addEventListener('submit', async evento => {
        evento.preventDefault();
        const dados = Object.fromEntries(new FormData(form).entries());
        const botao = form.querySelector('button[type=submit]');
        botao.disabled = true;
        try {
            await requisicao(id ? `/api/alunos/${id}` : '/api/alunos', {
                method: id ? 'PUT' : 'POST', body: JSON.stringify(dados)
            });
            mostrarMensagem(aviso, 'Cadastro salvo com sucesso!', 'sucesso');
            setTimeout(() => { location.href = '/listar.html'; }, 650);
        } catch (erro) {
            mostrarMensagem(aviso, erro.message, 'erro');
        } finally {
            botao.disabled = false;
        }
    });
}

function criarCelula(tr, texto) {
    const td = document.createElement('td');
    td.textContent = texto;
    tr.append(td);
    return td;
}

async function iniciarLista() {
    const tabela = document.querySelector('#tabelaParticipantes');
    const aviso = document.querySelector('#mensagemLista');
    let alunos = [];

    function desenhar() {
        const pesquisa = document.querySelector('#pesquisa').value.trim().toLowerCase();
        const status = document.querySelector('#filtroSituacao').value;
        const encontrados = alunos.filter(aluno =>
            (aluno.nome.toLowerCase().includes(pesquisa) || aluno.email.includes(pesquisa)) &&
            (!status || aluno.situacao === status)
        );
        tabela.replaceChildren();
        if (!encontrados.length) {
            const tr = document.createElement('tr');
            const td = criarCelula(tr, 'Nenhum participante encontrado.');
            td.colSpan = 6;
            tabela.append(tr);
            return;
        }
        for (const aluno of encontrados) {
            const tr = document.createElement('tr');
            criarCelula(tr, aluno.id);
            criarCelula(tr, aluno.nome);
            criarCelula(tr, aluno.email);
            criarCelula(tr, aluno.curso);
            const colunaStatus = document.createElement('td');
            const tag = document.createElement('span');
            tag.className = `tag ${aluno.situacao === 'Ativo' ? 'ativo' : ''}`;
            tag.textContent = aluno.situacao;
            colunaStatus.append(tag);
            tr.append(colunaStatus);

            const acoes = document.createElement('td');
            acoes.className = 'acoes-tabela';
            const editar = document.createElement('a');
            editar.className = 'link-acao';
            editar.href = `/cadastro.html?id=${aluno.id}`;
            editar.textContent = 'Editar';
            const excluir = document.createElement('button');
            excluir.className = 'link-acao excluir';
            excluir.type = 'button';
            excluir.textContent = 'Excluir';
            excluir.addEventListener('click', async () => {
                if (!confirm(`Deseja excluir o cadastro de ${aluno.nome}?`)) return;
                try {
                    await requisicao(`/api/alunos/${aluno.id}`, { method: 'DELETE' });
                    alunos = alunos.filter(x => x.id !== aluno.id);
                    desenhar();
                    mostrarMensagem(aviso, 'Participante excluído.', 'sucesso');
                } catch (erro) { mostrarMensagem(aviso, erro.message, 'erro'); }
            });
            acoes.append(editar, excluir);
            tr.append(acoes);
            tabela.append(tr);
        }
    }

    document.querySelector('#pesquisa').addEventListener('input', desenhar);
    document.querySelector('#filtroSituacao').addEventListener('change', desenhar);
    try {
        alunos = await requisicao('/api/alunos');
        desenhar();
    } catch (erro) {
        mostrarMensagem(aviso, erro.message, 'erro');
    }
}

function iniciarAcesso() {
    const form = document.querySelector('#formAcesso');
    const aviso = document.querySelector('#mensagemAcesso');
    form.addEventListener('submit', async evento => {
        evento.preventDefault();
        const dados = Object.fromEntries(new FormData(form).entries());
        mostrarMensagem(aviso, 'Verificando...');
        try {
            const resposta = await requisicao('/api/acesso', {
                method: 'POST', body: JSON.stringify(dados)
            });
            mostrarMensagem(aviso, `${resposta.mensagem} Bem-vindo(a), ${resposta.aluno.nome}!`, 'sucesso');
        } catch (erro) {
            mostrarMensagem(aviso, erro.message, 'erro');
        }
    });
}

const pagina = document.body.dataset.pagina;
if (pagina === 'inicio') iniciarHome();
if (pagina === 'cadastro') iniciarCadastro();
if (pagina === 'lista') iniciarLista();
if (pagina === 'acesso') iniciarAcesso();
