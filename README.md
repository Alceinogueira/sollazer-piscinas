# Sollazer Piscinas — Estrutura Inicial do Projeto

Loja virtual + painel administrativo para revenda de produtos e equipamentos
de piscina (bombas, filtros, aquecedores, capas térmicas, produtos químicos etc.).

## Estrutura de pastas

```
sollazer-piscinas/
├── frontend/                  # HTML5 + CSS3 + JS puro (mobile-first)
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── assets/                # (crie esta pasta e coloque as imagens: hero-pool.jpg, filtro.jpg, etc.)
│
└── backend/                   # Node.js + Express + MySQL
    ├── server.js               # ponto de entrada da API
    ├── database.sql            # script de criação das tabelas + seed
    ├── package.json
    ├── .env.example             # copie para ".env" e preencha
    ├── config/
    │   └── db.js                # pool de conexão MySQL
    ├── middleware/
    │   └── auth.js              # validação de JWT (rotas protegidas)
    └── routes/
        ├── produtos.public.js   # GET /api/produtos (vitrine)
        ├── produtos.admin.js    # CRUD /api/admin/produtos (protegido)
        ├── orcamentos.js        # POST /api/orcamentos
        └── auth.js              # POST /api/auth/login
```

## Como rodar o backend

```bash
cd backend
cp .env.example .env      # edite com suas credenciais reais
npm install
mysql -u root -p < database.sql   # cria banco + tabelas + dados de exemplo
npm run dev                # ou "npm start"
```

A API sobe em `http://localhost:3000`. Endpoints principais:

| Método | Rota                      | Acesso     | Descrição                          |
|--------|----------------------------|------------|-------------------------------------|
| GET    | /api/produtos              | Público    | Lista produtos ativos (vitrine)     |
| GET    | /api/produtos/:id          | Público    | Detalhe de um produto               |
| POST   | /api/orcamentos            | Público    | Envia solicitação de orçamento      |
| POST   | /api/auth/login            | Público    | Login do administrador (retorna JWT)|
| GET    | /api/admin/produtos        | Protegido  | Lista todos os produtos (admin)     |
| POST   | /api/admin/produtos        | Protegido  | Cria produto                        |
| PUT    | /api/admin/produtos/:id    | Protegido  | Edita produto                       |
| DELETE | /api/admin/produtos/:id    | Protegido  | Exclui produto                      |

Rotas protegidas exigem o header:
`Authorization: Bearer <token retornado no login>`

## Como rodar o frontend

O frontend é HTML/CSS/JS puro — basta abrir `frontend/index.html` em um
servidor estático (ex: extensão "Live Server" do VS Code, ou `npx serve frontend`).

A URL da API pode ser definida antes dos scripts com `window.SOLLAZER_API_BASE_URL`.
Sem essa variável, o desenvolvimento usa `http://localhost:3000/api`.

## Painel do funcionário

Abra `frontend/admin/login.html`. Depois do login, o funcionário pode adicionar,
editar, ocultar e excluir produtos, incluindo preço, estoque e URL da foto. Também
pode criar e ordenar ofertas do carrossel em `frontend/admin/dashboard.html`.

Depois de criar a tabela nova, rode novamente o trecho de `backend/database.sql`
em seu MySQL. O login exige um administrador cadastrado com senha armazenada em
hash bcrypt; a função auxiliar está em `backend/routes/auth.js`.

## Deploy na Vercel

O projeto deve ser publicado em dois projetos Vercel:

1. **Backend:** crie um projeto apontando para a pasta `backend`. O arquivo
   `backend/vercel.json` já configura o Express como função serverless. Cadastre
   as variáveis `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`,
   `JWT_SECRET` e `JWT_EXPIRES_IN` no painel da Vercel. O banco precisa ser um
   MySQL remoto, pois o MySQL local não existe na Vercel.
2. **Frontend:** crie outro projeto apontando para `frontend`. Antes dos scripts,
   defina `window.SOLLAZER_API_BASE_URL` com a URL pública do backend seguida de
   `/api`, por exemplo `https://sollazer-api.vercel.app/api`. A mesma URL deve ser
   usada pelo login e pelo painel.

Antes de publicar, execute o `database.sql` no banco remoto e crie o primeiro
administrador. Teste `/api/health`, o login, o cadastro de produto e a criação de
uma oferta antes de divulgar a URL.

## Próximos passos sugeridos

1. Criar a pasta `frontend/assets/` com as imagens reais dos produtos e do hero.
2. Construir as telas do painel administrativo (`admin/login.html`, `admin/dashboard.html`)
   consumindo as rotas `/api/admin/produtos` e `/api/auth/login`.
3. Cadastrar o primeiro administrador executando a função `criarAdminExemplo()`
   (veja comentário em `routes/auth.js`) — nunca insira a senha em texto puro direto no banco.
4. Implementar HTTPS e restringir o CORS ao domínio final da loja em produção.
5. Adicionar rate limiting (ex: `express-rate-limit`) na rota de login para
   mitigar ataques de força bruta.
