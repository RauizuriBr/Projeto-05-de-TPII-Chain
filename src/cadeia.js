// Chain of Responsibility: cada etapa valida um aspecto do pedido de acesso.
const { conferirCodigo, emailValido } = require('./validacao');

class EtapaAcesso {
    constructor() {
        this.proxima = null;
    }

    definirProxima(etapa) {
        this.proxima = etapa;
        return etapa;
    }

    continuar(pedido) {
        if (this.proxima) return this.proxima.verificar(pedido);
        return {
            autorizado: true,
            mensagem: 'Acesso autorizado.',
            aluno: { nome: pedido.aluno.nome, curso: pedido.aluno.curso }
        };
    }
}

class VerificarCampos extends EtapaAcesso {
    verificar(pedido) {
        if (!pedido.email || !pedido.codigo) {
            return { autorizado: false, mensagem: 'Informe o e-mail e o código de acesso.' };
        }
        return this.continuar(pedido);
    }
}

class VerificarFormato extends EtapaAcesso {
    verificar(pedido) {
        if (!emailValido(pedido.email) || !/^\d{6}$/.test(pedido.codigo)) {
            return { autorizado: false, mensagem: 'E-mail ou código em formato inválido.' };
        }
        return this.continuar(pedido);
    }
}

class VerificarCadastro extends EtapaAcesso {
    constructor(banco) {
        super();
        this.banco = banco;
    }

    verificar(pedido) {
        pedido.aluno = this.banco.buscarPorEmail(pedido.email);
        if (!pedido.aluno) {
            return { autorizado: false, mensagem: 'Participante não cadastrado.' };
        }
        return this.continuar(pedido);
    }
}

class VerificarSituacao extends EtapaAcesso {
    verificar(pedido) {
        if (pedido.aluno.situacao !== 'Ativo') {
            return { autorizado: false, mensagem: 'Cadastro inativo. Procure o responsável.' };
        }
        return this.continuar(pedido);
    }
}

class VerificarCodigo extends EtapaAcesso {
    verificar(pedido) {
        if (!conferirCodigo(pedido.codigo, pedido.aluno)) {
            return { autorizado: false, mensagem: 'Código de acesso incorreto.' };
        }
        return this.continuar(pedido);
    }
}

function criarCadeia(banco) {
    const campos = new VerificarCampos();
    campos.definirProxima(new VerificarFormato())
          .definirProxima(new VerificarCadastro(banco))
          .definirProxima(new VerificarSituacao())
          .definirProxima(new VerificarCodigo());
    return campos;
}

module.exports = { criarCadeia };
