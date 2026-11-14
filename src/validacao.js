const { randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');

function criarCodigoSeguro(codigo) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(String(codigo), salt, 32).toString('hex');
    return { codigo_hash: hash, codigo_salt: salt };
}

function conferirCodigo(codigo, aluno) {
    const calculado = scryptSync(String(codigo), aluno.codigo_salt, 32);
    const guardado = Buffer.from(aluno.codigo_hash, 'hex');
    return calculado.length === guardado.length && timingSafeEqual(calculado, guardado);
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function prepararCadastro(entrada, anterior = null) {
    const campos = ['nome', 'email', 'telefone', 'curso', 'cep', 'logradouro',
        'numero', 'bairro', 'cidade', 'uf', 'situacao'];
    const aluno = {};
    for (const campo of campos) {
        aluno[campo] = String(entrada[campo] ?? '').trim();
    }
    aluno.email = aluno.email.toLowerCase();
    aluno.cep = aluno.cep.replace(/\D/g, '');
    aluno.uf = aluno.uf.toUpperCase();
    aluno.situacao = aluno.situacao || 'Ativo';

    if (campos.some(campo => !aluno[campo])) {
        return { erro: 'Preencha todos os campos obrigatórios.' };
    }
    if (!emailValido(aluno.email)) {
        return { erro: 'Informe um e-mail válido.' };
    }
    if (!/^\d{8}$/.test(aluno.cep)) {
        return { erro: 'O CEP deve ter 8 números.' };
    }
    if (!/^\d{10,11}$/.test(aluno.telefone.replace(/\D/g, ''))) {
        return { erro: 'O telefone deve ter 10 ou 11 números.' };
    }
    if (!/^[A-Z]{2}$/.test(aluno.uf)) {
        return { erro: 'UF deve conter duas letras.' };
    }
    if (!['Ativo', 'Inativo'].includes(aluno.situacao)) {
        return { erro: 'Situação inválida.' };
    }

    const codigo = String(entrada.codigo ?? '').trim();
    if (codigo !== '') {
        if (!/^\d{6}$/.test(codigo)) {
            return { erro: 'O código de acesso deve ter exatamente 6 dígitos.' };
        }
        Object.assign(aluno, criarCodigoSeguro(codigo));
    } else if (anterior) {
        aluno.codigo_hash = anterior.codigo_hash;
        aluno.codigo_salt = anterior.codigo_salt;
    } else {
        return { erro: 'Crie um código de acesso com 6 dígitos.' };
    }
    return { aluno };
}

module.exports = { prepararCadastro, conferirCodigo, emailValido };
