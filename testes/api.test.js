const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { Banco } = require('../src/banco');
const { criarServidor } = require('../app');

const aluno = {
    nome: 'Ana Costa', email: 'ana@exemplo.com', telefone: '11912345678',
    curso: 'Desenvolvimento de Sistemas', cep: '01001000', logradouro: 'Praça da Sé',
    numero: '100', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP',
    situacao: 'Ativo', codigo: '123456'
};

async function post(base, rota, dados, metodo = 'POST') {
    const resposta = await fetch(base + rota, {
        method: metodo, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });
    return { status: resposta.status, dados: await resposta.json() };
}

test('CRUD, cadeia de acesso, ViaCEP e persistencia', async () => {
    const pasta = mkdtempSync(path.join(tmpdir(), 'registrolab-'));
    const arquivo = path.join(pasta, 'teste.sqlite');
    const banco = new Banco(arquivo);
    const { servidor } = criarServidor({
        banco,
        consultarCep: async cep => ({ logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' })
    });
    await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${servidor.address().port}`;

    try {
        let resposta = await fetch(base + '/');
        assert.equal(resposta.status, 200);
        assert.match(await resposta.text(), /RegistroLab/);
        resposta = await fetch(base + '/site.js');
        assert.equal(resposta.status, 200);

        resposta = await fetch(base + '/api/alunos');
        assert.equal(resposta.status, 200);
        assert.equal((await resposta.json()).length, 0);

        const faltando = await post(base, '/api/alunos', { nome: 'Ana' });
        assert.equal(faltando.status, 400);

        const novo = await post(base, '/api/alunos', aluno);
        assert.equal(novo.status, 201);
        assert.equal(novo.dados.nome, 'Ana Costa');
        assert.equal(novo.dados.codigo_hash, undefined);
        const id = novo.dados.id;

        const duplicado = await post(base, '/api/alunos', aluno);
        assert.equal(duplicado.status, 409);

        resposta = await fetch(base + `/api/alunos/${id}`);
        assert.equal(resposta.status, 200);
        assert.equal((await resposta.json()).email, 'ana@exemplo.com');

        const semCodigo = await post(base, '/api/acesso', { email: aluno.email });
        assert.equal(semCodigo.status, 403);
        const invalido = await post(base, '/api/acesso', { email: 'invalido', codigo: '123456' });
        assert.equal(invalido.status, 403);
        const inexistente = await post(base, '/api/acesso', { email: 'outro@exemplo.com', codigo: '123456' });
        assert.equal(inexistente.status, 403);
        const errado = await post(base, '/api/acesso', { email: aluno.email, codigo: '222222' });
        assert.equal(errado.status, 403);
        const correto = await post(base, '/api/acesso', { email: aluno.email, codigo: '123456' });
        assert.equal(correto.status, 200);
        assert.equal(correto.dados.autorizado, true);

        const editado = await post(base, `/api/alunos/${id}`, { ...aluno, situacao: 'Inativo', codigo: '' }, 'PUT');
        assert.equal(editado.status, 200);
        assert.equal(editado.dados.situacao, 'Inativo');
        const bloqueado = await post(base, '/api/acesso', { email: aluno.email, codigo: '123456' });
        assert.equal(bloqueado.status, 403);

        const reativado = await post(base, `/api/alunos/${id}`, { ...aluno, codigo: '654321' }, 'PUT');
        assert.equal(reativado.status, 200);
        assert.equal((await post(base, '/api/acesso', { email: aluno.email, codigo: '123456' })).status, 403);
        assert.equal((await post(base, '/api/acesso', { email: aluno.email, codigo: '654321' })).status, 200);

        resposta = await fetch(base + '/api/cep/01001000');
        assert.equal(resposta.status, 200);
        assert.equal((await resposta.json()).cidade, 'São Paulo');
        assert.equal((await fetch(base + '/api/cep/123')).status, 400);
        assert.equal((await fetch(base + '/api/qualquer')).status, 404);

        // Banco salva os dados mesmo se outra instancia for aberta.
        const outraConexao = new Banco(arquivo);
        assert.equal(outraConexao.listar().length, 1);
        outraConexao.fechar();

        resposta = await fetch(base + `/api/alunos/${id}`, { method: 'DELETE' });
        assert.equal(resposta.status, 204);
        assert.equal((await fetch(base + `/api/alunos/${id}`)).status, 404);
    } finally {
        await new Promise(resolve => servidor.close(resolve));
        banco.fechar();
        rmSync(pasta, { force: true, recursive: true });
    }
});


test('falha no servico externo retorna mensagem apropriada', async () => {
    const pasta = mkdtempSync(path.join(tmpdir(), 'registrolab-erro-'));
    const banco = new Banco(path.join(pasta, 'teste.sqlite'));
    const { servidor } = criarServidor({ banco, consultarCep: async () => { throw new Error('offline'); } });
    await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${servidor.address().port}`;
    try {
        const resposta = await fetch(base + '/api/cep/01001000');
        assert.equal(resposta.status, 502);
        assert.match((await resposta.json()).erro, /manualmente/);
    } finally {
        await new Promise(resolve => servidor.close(resolve));
        banco.fechar();
        rmSync(pasta, { force: true, recursive: true });
    }
});
