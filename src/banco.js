// Operacoes de persistencia. O Node.js 22.13+ inclui SQLite nativamente.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

class Banco {
    constructor(arquivo = path.join(__dirname, '..', 'data', 'alunos.sqlite')) {
        fs.mkdirSync(path.dirname(arquivo), { recursive: true });
        this.db = new DatabaseSync(arquivo);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS alunos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                telefone TEXT NOT NULL,
                curso TEXT NOT NULL,
                cep TEXT NOT NULL,
                logradouro TEXT NOT NULL,
                numero TEXT NOT NULL,
                bairro TEXT NOT NULL,
                cidade TEXT NOT NULL,
                uf TEXT NOT NULL,
                situacao TEXT NOT NULL,
                codigo_hash TEXT NOT NULL,
                codigo_salt TEXT NOT NULL,
                criado_em TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `);
    }

    // Os dados secretos nao sao enviados nas consultas publicas.
    listar() {
        return this.db.prepare(`
            SELECT id, nome, email, telefone, curso, cep, logradouro,
                   numero, bairro, cidade, uf, situacao, criado_em
            FROM alunos ORDER BY id DESC
        `).all();
    }

    buscar(id) {
        return this.db.prepare(`
            SELECT id, nome, email, telefone, curso, cep, logradouro,
                   numero, bairro, cidade, uf, situacao, criado_em
            FROM alunos WHERE id = ?
        `).get(id) || null;
    }

    buscarPorEmail(email) {
        return this.db.prepare('SELECT * FROM alunos WHERE email = ?').get(email) || null;
    }

    cadastrar(aluno) {
        const dados = { ...aluno };
        const resultado = this.db.prepare(`
            INSERT INTO alunos (nome, email, telefone, curso, cep, logradouro,
                                numero, bairro, cidade, uf, situacao, codigo_hash, codigo_salt)
            VALUES (@nome, @email, @telefone, @curso, @cep, @logradouro,
                    @numero, @bairro, @cidade, @uf, @situacao, @codigo_hash, @codigo_salt)
        `).run(dados);
        return this.buscar(Number(resultado.lastInsertRowid));
    }

    atualizar(id, aluno) {
        const dados = { ...aluno, id };
        this.db.prepare(`
            UPDATE alunos SET nome=@nome, email=@email, telefone=@telefone,
                curso=@curso, cep=@cep, logradouro=@logradouro, numero=@numero,
                bairro=@bairro, cidade=@cidade, uf=@uf, situacao=@situacao,
                codigo_hash=@codigo_hash, codigo_salt=@codigo_salt
            WHERE id=@id
        `).run(dados);
        return this.buscar(id);
    }

    remover(id) {
        return this.db.prepare('DELETE FROM alunos WHERE id = ?').run(id).changes > 0;
    }

    fechar() {
        this.db.close();
    }
}

module.exports = { Banco };
