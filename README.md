# RegistroLab — Cadastro de Alunos e Controle de Acesso

**Projeto 05 — Técnicas de Programação II (TPII)**  
**Aluno:** Thiago Monteiro do Nascimento  
**RA:** 2171392521036

## Sobre o projeto

O RegistroLab é uma aplicação web para cadastrar participantes de atividades acadêmicas e verificar se eles estão autorizados a acessar um ambiente. O sistema reúne um cadastro com operações de **CRUD** e uma validação de acesso organizada com o padrão de projeto **Chain of Responsibility (Cadeia de Responsabilidade)**.

O objetivo da atividade é aplicar um padrão GoF em um exemplo prático, com responsabilidades distribuídas em classes, sem concentrar todas as verificações em uma única função.

## Funcionalidades

- Cadastrar participantes com nome, e-mail, telefone, curso/turma, endereço e situação do cadastro.
- Consultar os participantes cadastrados e pesquisar por nome ou e-mail.
- Filtrar cadastros pela situação **Ativo** ou **Inativo**.
- Editar informações e excluir registros, com confirmação antes da exclusão.
- Buscar dados de endereço pelo CEP usando o **ViaCEP**; se a consulta falhar, o preenchimento pode ser feito manualmente.
- Criar um código numérico de seis dígitos para cada participante.
- Verificar o acesso do participante por etapas, exibindo uma mensagem de autorização ou recusa.
- Manter os cadastros em um arquivo de banco de dados **SQLite**.

## Tecnologias utilizadas

- **Node.js** — servidor HTTP e lógica da aplicação, sem frameworks web.
- **HTML e CSS** — páginas e estilos da interface.
- **JavaScript** — interações da página e requisições com `fetch()`.
- **SQLite** — armazenamento local, com o módulo nativo `node:sqlite`.
- **ViaCEP** — consulta externa de endereços por CEP.

## Como funciona o Chain of Responsibility

O padrão **Chain of Responsibility** permite dividir o processamento de uma solicitação entre vários manipuladores. Cada etapa verifica uma condição e, quando ela é atendida, encaminha o pedido para a próxima. Se alguma etapa falhar, o processo é interrompido e uma mensagem explica o motivo.

Neste projeto, a verificação de acesso passa por cinco etapas:

1. **VerificarCampos:** confere se e-mail e código foram informados.
2. **VerificarFormato:** valida o formato do e-mail e os seis dígitos do código.
3. **VerificarCadastro:** procura o participante cadastrado no banco de dados.
4. **VerificarSituacao:** confirma se a situação do participante é **Ativo**.
5. **VerificarCodigo:** confere se o código informado corresponde ao do cadastro.

**Fluxo da solicitação:**

```text
Formulário de acesso
        |
        v
VerificarCampos
        |
        v
VerificarFormato
        |
        v
VerificarCadastro
        |
        v
VerificarSituacao
        |
        v
VerificarCodigo
        |
        v
Acesso autorizado
```

Caso uma das etapas não seja aprovada, a cadeia para naquele ponto. A implementação está no arquivo `src/cadeia.js`.

## Estrutura do projeto

```text
Projeto05_Cadastro_Acesso_Chain/
|-- app.js                 # Servidor HTTP e rotas da API
|-- package.json           # Comandos npm
|-- src/
|   |-- banco.js           # Cadastro e persistência com SQLite
|   |-- cadeia.js          # Padrão Chain of Responsibility
|   `-- validacao.js       # Validação dos campos e código de acesso
|-- public/
|   |-- index.html         # Página inicial
|   |-- cadastro.html      # Cadastro e edição
|   |-- listar.html        # Listagem e pesquisa
|   |-- acesso.html        # Teste de acesso
|   |-- estilo.css         # Estilos
|   `-- site.js            # Requisições fetch() e interações
|-- testes/
|   `-- api.test.js        # Testes automatizados
`-- .gitignore
```

O banco é gerado automaticamente em `data/alunos.sqlite` na primeira execução. Essa pasta é ignorada pelo Git para não publicar os registros cadastrados.

## Como executar

**Requisito:** Node.js **22.13 ou superior** instalado no computador.

1. Baixe ou clone o repositório.
2. Abra a pasta do projeto no VS Code.
3. Abra o terminal e confira a versão do Node.js:

   ```bash
   node -v
   ```

4. Inicie o servidor:

   ```bash
   npm start
   ```

5. Acesse no navegador:

   ```text
   http://localhost:3000
   ```

Não é necessário rodar `npm install` para instalar bibliotecas externas, pois o projeto utiliza os recursos nativos do Node.js. O `npm start` executa o comando definido em `package.json`.

Para parar o servidor, pressione **Ctrl + C** no terminal.

## Como testar a aplicação

1. Na página **Cadastrar**, registre um participante e informe um código de seis dígitos.
2. Se desejar, use **Buscar CEP** para preencher os campos de endereço.
3. Abra **Participantes** e teste a pesquisa, o filtro, a edição e a exclusão.
4. Abra **Verificar acesso** e informe o e-mail e o código cadastrados.
5. Faça novos testes com um código incorreto e com a situação **Inativo** para observar a cadeia interrompendo o acesso.

Os códigos de acesso não são exibidos nas consultas públicas. O sistema armazena um *hash* com *salt* para verificar o código informado.

### Testes automatizados

```bash
npm test
```

## Rotas principais da API

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/api/alunos` | Listar participantes |
| `GET` | `/api/alunos/:id` | Consultar participante por ID |
| `POST` | `/api/alunos` | Cadastrar participante |
| `PUT` | `/api/alunos/:id` | Atualizar participante |
| `DELETE` | `/api/alunos/:id` | Excluir participante |
| `POST` | `/api/acesso` | Verificar autorização pela cadeia |
| `GET` | `/api/cep/:cep` | Consultar endereço pelo ViaCEP |

As respostas da API são enviadas em JSON. O servidor também informa erros quando os dados são inválidos, o participante não existe ou uma rota não foi encontrada.

## Referências

- GAMMA, Erich et al. *Padrões de projeto: soluções reutilizáveis de software orientado a objetos*. Bookman.
- Material de aula de **Técnicas de Programação II** — padrão GoF *Chain of Responsibility*.
- [Documentação do Node.js](https://nodejs.org/docs/latest/api/)
- [Documentação do ViaCEP](https://viacep.com.br/)

---

Projeto acadêmico desenvolvido para praticar CRUD, integração com API externa e padrões de projeto orientados a objetos.
