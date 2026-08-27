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

Isso já sobe **tudo junto** em `http://localhost:3000`: a API (`/api/...`), a
loja (`/`) e o painel (`/admin/login.html`) — o próprio backend serve os
arquivos do frontend (veja `express.static` em `server.js`). Não precisa
abrir mais nenhum outro servidor pra testar localmente.

## Como rodar com Docker Compose

Com Docker Desktop (macOS/Windows) ou Docker Engine + Compose (Linux), na raiz
do projeto execute:

```bash
docker compose up --build
```

O frontend ficará disponível em `http://localhost:8080` e o painel em
`http://localhost:8080/admin/login.html`. O Nginx encaminha `/api` para o
backend, enquanto o MySQL é criado automaticamente com os dados de
`backend/database.sql`. Os dados do banco e as imagens enviadas pelo painel
ficam em volumes Docker persistentes.

Para parar os serviços:

```bash
docker compose down
```

Para remover também os dados locais do banco e os uploads, use
`docker compose down -v`.

Endpoints principais da API:

| Método | Rota                      | Acesso              | Descrição                          |
|--------|----------------------------|---------------------|--------------------------------------|
| GET    | /api/produtos              | Público             | Lista produtos ativos (vitrine)     |
| GET    | /api/produtos/:id          | Público             | Detalhe de um produto               |
| POST   | /api/orcamentos            | Público             | Envia solicitação de orçamento      |
| POST   | /api/auth/login            | Público             | Login do administrador (retorna JWT)|
| GET    | /api/admin/produtos        | admin + funcionario | Lista todos os produtos             |
| POST   | /api/admin/produtos        | admin + funcionario | Cria produto                        |
| PUT    | /api/admin/produtos/:id    | admin + funcionario | Edita produto (inclusive preço)     |
| DELETE | /api/admin/produtos/:id    | somente admin       | Exclui produto                      |
| GET/POST/PUT/DELETE | /api/admin/ofertas | somente admin | Ofertas do carrossel                |

Rotas protegidas exigem o header:
`Authorization: Bearer <token retornado no login>`

## Como rodar o frontend

O frontend é HTML/CSS/JS puro. **Localmente, o jeito mais simples é deixar o
próprio backend servir tudo** — basta rodar `npm run dev` dentro de `backend`
(veja acima) e abrir `http://localhost:3000` no navegador. O arquivo
`frontend/js/config.js` já detecta que está em `localhost`/`127.0.0.1` e usa a
API local automaticamente, sem precisar editar nada.

Se preferir publicar o frontend separado do backend (ex: dois projetos na
Vercel, ou outro domínio), aí sim use um servidor estático próprio (extensão
"Live Server" do VS Code, `npx serve frontend`, etc.) e ajuste
`window.SOLLAZER_API_BASE_URL` em `frontend/js/config.js` para apontar para a
URL pública do backend.

## Painel administrativo — dois níveis de acesso

Abra `frontend/admin/login.html`. Existem dois papéis de acesso, controlados
pela coluna `papel` da tabela `administradores`:

- **`admin`** (dono da loja): acesso total — produtos (criar, editar, excluir)
  e ofertas do carrossel (criar, editar, excluir, ordenar).
- **`funcionario`**: acesso restrito — pode **adicionar produtos, editar
  produtos e alterar preço/estoque**, mas **não pode excluir produtos nem
  mexer nas ofertas do carrossel** (o painel nem mostra essa seção pra ele).

Se o produto não deve mais aparecer na loja, o funcionário pode ocultá-lo
marcando "Visível: Não" — a exclusão de verdade fica só com o admin.

Se você já tinha o banco criado antes desse recurso, rode a migração
`backend/migrations/003_add_papel_administradores.sql` — ela promove todas as
contas já existentes para `admin` (o dono) e deixa `funcionario` como papel
padrão para as novas contas criadas dali em diante.

Para criar (ou atualizar) os acessos, dentro de `backend`:

```bash
# acesso do dono (total)
npm run create-admin -- "Seu Nome" "usuario" "senha"

# acesso do funcionário (restrito)
npm run create-funcionario -- "Alcei" "alcei" "senha-do-alcei"
```

Ambos os comandos criam ou atualizam a conta usando hash bcrypt. A senha não
é salva no código nem no repositório.

**Atenção ao subir para a VPS:** o pacote `bcrypt` é nativo (compilado para o
sistema operacional onde foi instalado). Não copie a pasta `node_modules` de
uma máquina para outra — na VPS, rode `npm install` (ou `npm rebuild bcrypt`
se já tiver copiado) para gerar o binário certo para aquele Linux.

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
