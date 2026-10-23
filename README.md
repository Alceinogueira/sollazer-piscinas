# Sollazer Piscinas

Loja virtual e painel administrativo para a revenda de produtos e equipamentos de piscina
(bombas, filtros, aquecedores, capas térmicas, produtos químicos e mais). Cada cidade atendida
tem o seu próprio catálogo de produtos.

**Em produção:** https://sollazerpiscina.com.br
**Painel administrativo:** https://sollazerpiscina.com.br/admin/login.html

## Funcionalidades

**Loja (público)**
- Vitrine de produtos com catálogo por cidade (Trancoso, Eunápolis e Arraial d'Ajuda)
- Ofertas em destaque
- Detalhe do produto e pedido de orçamento

**Painel administrativo (login)**
- Login com JWT e dois perfis: administrador e funcionário
- Cadastro, edição e exclusão de produtos (exclusão só para administrador)
- Gerenciamento de ofertas
- Upload de imagens de produtos e ofertas

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Front-end | HTML5, CSS3 e JavaScript puro (mobile-first) |
| Back-end | Node.js, Express |
| Banco de dados | MySQL 8.4 (mysql2) |
| Segurança | JWT (jsonwebtoken), bcrypt, express-validator, CORS |
| Upload de imagens | multer e sharp |
| Infraestrutura | Docker Compose, Nginx, Traefik (HTTPS com Let's Encrypt) |

## Arquitetura

```
Navegador ──HTTPS──> Traefik ──> Nginx (frontend) ──/api──> Node/Express ──> MySQL
```

Em produção tudo roda numa VPS com Docker Compose. O Nginx serve o front-end e encaminha `/api`
para o back-end, então a loja e a API usam a mesma origem. O MySQL não tem porta pública.
Detalhes de deploy e manutenção em [`docs/Pop/DEPLOY.md`](docs/Pop/DEPLOY.md).

## Estrutura de pastas

```
sollazer-piscinas/
├── frontend/            # loja e painel admin (HTML, CSS, JS) + Nginx
├── backend/
│   ├── server.js        # ponto de entrada da API
│   ├── routes/          # produtos, ofertas, orçamentos, uploads e auth
│   ├── middleware/      # validação do JWT e perfis
│   ├── config/          # conexão com o MySQL e lista de cidades
│   ├── migrations/      # alterações do banco, em ordem (001 a 006)
│   ├── scripts/         # criação de usuários admin e funcionário
│   └── database.sql     # criação das tabelas
├── docs/Pop/DEPLOY.md   # guia de deploy
├── docker-compose.yml   # produção (Traefik + Nginx + Node + MySQL)
└── .env.example         # variáveis do Compose
```

## Como rodar localmente

Pré-requisitos: Node.js 18+ e MySQL 8.

```bash
cd backend
cp .env.example .env          # preencha DB_PASSWORD e JWT_SECRET
npm install
mysql -u root -p < database.sql
# aplique também os arquivos de backend/migrations em ordem (001 a 006)
npm run dev
```

A API sobe em `http://localhost:3000` e já serve a loja (`/`) e o painel (`/admin/login.html`).

Para criar o primeiro acesso ao painel:

```bash
node scripts/create-admin.js "Nome" "usuario" "senha" trancoso
node scripts/create-funcionario.js "Nome" "usuario" "senha" trancoso
```

## Variáveis de ambiente

| Variável | Onde | Descrição |
|----------|------|-----------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | `backend/.env` | Conexão com o MySQL |
| `JWT_SECRET` | `backend/.env` e `.env` | Segredo de assinatura dos tokens (use valor longo e aleatório) |
| `JWT_EXPIRES_IN` | `backend/.env` | Validade do token (padrão `8h`) |
| `PORT` | `backend/.env` | Porta da API (padrão `3000`) |
| `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `JWT_SECRET` | `.env` (raiz) | Usadas pelo `docker-compose.yml` |

Nunca envie os arquivos `.env` reais para o GitHub.

## Produção (Docker Compose)

```bash
cp .env.example .env     # defina DB_PASSWORD, MYSQL_ROOT_PASSWORD e JWT_SECRET
docker compose up -d --build
```

O `docker-compose.yml` está configurado para o domínio da loja. Para publicar em outro domínio,
ajuste as regras `Host(...)` do Traefik. Veja o passo a passo completo em `docs/Pop/DEPLOY.md`.

## API

`GET /api/health` responde o status do serviço. Os endpoints de catálogo recebem o parâmetro
`cidade` (`trancoso`, `eunapolis` ou `arraial_dajuda`).

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/api/produtos?cidade=` | Público | Lista os produtos ativos da cidade |
| GET | `/api/produtos/:id` | Público | Detalhe de um produto |
| GET | `/api/ofertas?cidade=` | Público | Ofertas em destaque |
| POST | `/api/orcamentos` | Público | Envia pedido de orçamento |
| POST | `/api/auth/login` | Público | Login do painel (retorna JWT) |
| GET/POST/PUT | `/api/admin/produtos` | Admin e funcionário | Lista, cria e edita produtos |
| DELETE | `/api/admin/produtos/:id` | Somente admin | Exclui produto |
| GET/POST/PUT/DELETE | `/api/admin/ofertas` | Admin e funcionário | Gerencia ofertas |
| POST | `/api/admin/uploads` | Admin e funcionário | Envia imagem |

## Autor

Alcei Nogueira Gomes Filho · [GitHub](https://github.com/Alceinogueira)
