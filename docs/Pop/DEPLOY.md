# Deploy e alteracoes do Sollazer Piscinas

Guia operacional para executar, publicar, atualizar e manter o projeto.

## Arquitetura

A aplicacao roda na VPS com Docker Compose:

- `traefik`: proxy reverso, HTTPS e roteamento TCP.
- `frontend`: Nginx servindo HTML, CSS, JavaScript e imagens.
- `backend`: API Node.js/Express na porta interna `3000`.
- `db`: MySQL 8.4 na porta interna `3306`.

Os dados persistentes ficam nestes volumes Docker:

- `mysql_data`: banco de dados.
- `uploads`: imagens enviadas pelo painel.
- `letsencrypt`: certificados e estado do ACME.

O projeto publicado na VPS fica em `/opt/sollazer-piscinas`.

## Enderecos de producao

- Loja: `https://sollazerpiscina.com.br` (e `https://www.sollazerpiscina.com.br`)
- Painel: `https://sollazerpiscina.com.br/admin/login.html`
- API: `https://sollazerpiscina.com.br/api` (o Nginx faz proxy interno para o backend)
- Healthcheck: `https://sollazerpiscina.com.br/api/health`
- MySQL: `169.58.246.66:3306` (roteamento TCP; qualquer host que resolva para a VPS)

Dominio antigo `sollazer.alcei.online` / `sollazer-api.alcei.online` continua
aceito nas regras do Traefik durante a transicao; pode ser removido depois.

Os registros DNS devem apontar para o IP da VPS (`169.58.246.66`) antes da
emissao dos certificados. O email do certificado Let\'s Encrypt e
`alceinogueira1@gmail.com`.

### DNS a configurar no registrador (.com.br)

| Tipo | Nome  | Valor            |
|------|-------|------------------|
| A    | `@`   | `169.58.246.66`  |
| A    | `www` | `169.58.246.66`  |

A loja fala com a API na mesma origem (`/api`), entao **nao e preciso** um
subdominio `api.` nem certificado separado. Se um dia quiser expor a API
direto num subdominio, crie o registro A para `api` primeiro e so entao
adicione `Host(\`api.sollazerpiscina.com.br\`)` na regra do backend no
`docker-compose.yml` — nao adicione a regra antes do DNS existir, senao o
Traefik fica tentando emitir certificado e falhando.

## Primeiro deploy na VPS

Requisitos: acesso SSH como usuario com permissao para executar Docker e DNS
configurado para os tres subdominios.

```bash
ssh root@IP_DA_VPS
apt-get update
apt-get install -y git
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

Clone o repositorio e inicie a stack:

```bash
git clone https://github.com/Alceinogueira/sollazer-piscinas.git /opt/sollazer-piscinas
cd /opt/sollazer-piscinas
docker compose config --quiet
docker compose up -d --build
```

Verifique os servicos:

```bash
docker compose ps
docker compose logs --tail 100 traefik backend db frontend
curl -fsS https://sollazer-api.alcei.online/api/health
```

O MySQL executa `backend/database.sql` somente na primeira inicializacao do
volume `mysql_data`. Reiniciar ou reconstruir containers nao apaga o banco.

## Atualizacao da aplicacao

Toda alteracao deve ser publicada primeiro no GitHub. Na VPS:

```bash
cd /opt/sollazer-piscinas
git pull --ff-only origin main
docker compose config --quiet
docker compose up -d --build

docker compose ps
```

Para atualizar somente o frontend:

```bash
docker compose up -d --build frontend
```

Para atualizar somente o backend:

```bash
docker compose up -d --build backend
```

Depois de uma atualizacao, valide a API e a loja:

```bash
curl -fsS https://sollazer-api.alcei.online/api/health
curl -I https://sollazer.alcei.online
```

## Fluxo para fazer alteracoes

Na maquina de desenvolvimento:

```bash
git status
git pull --ff-only origin main
```

1. Altere somente os arquivos necessarios.
2. Teste o codigo localmente.
3. Valide a configuracao: `docker compose config --quiet`.
4. Verifique o diff: `git diff --check`.
5. Crie um commit com uma mensagem objetiva.
6. Envie para a branch `main`.
7. Atualize a VPS usando o procedimento de atualizacao acima.
8. Confira logs, healthcheck, login e a funcionalidade alterada.

Exemplo:

```bash
git add frontend/ backend/ docker-compose.yml
git commit -m "Descreve a alteracao"
git push origin main
```

Nunca versionar:

- arquivos `.env`;
- senhas, tokens ou chaves JWT;
- `node_modules`;
- dumps de banco contendo dados reais.

## Configuracao do frontend e API

O arquivo `frontend/js/config.js` tem uma lista `selfHostedHosts`. Para esses
hosts (local, `sollazerpiscina.com.br`, `www`, e o antigo `sollazer.alcei.online`)
a loja chama `/api` na propria origem — o Nginx (`frontend/nginx.conf`) faz o
proxy para o backend. Qualquer outro host cai na URL Vercel de fallback.

Se ganhar mais um dominio, adicione o host nessa lista e nas labels
`traefik.http.routers.sollazer.rule` do `docker-compose.yml`. Depois commit,
push e rebuild do frontend.

## Traefik e certificados

O Traefik publica as portas `80`, `443` e `3306`.

- O frontend usa `Host(sollazerpiscina.com.br) || Host(www.sollazerpiscina.com.br) || Host(sollazer.alcei.online)`.
- O backend usa `Host(sollazer-api.alcei.online)` (a loja em `sollazerpiscina.com.br` fala com a API via proxy do Nginx em `/api`, nao direto por esse router).
- O banco usa roteamento TCP na porta `3306`.
- HTTP e redirecionado para HTTPS.
- Os certificados sao renovados automaticamente pelo desafio HTTP.

Comandos uteis:

```bash
cd /opt/sollazer-piscinas
docker compose logs -f traefik
docker compose config --quiet
docker compose restart traefik
```

Nao habilite `--api.insecure=true` em producao. O dashboard administrativo do
Traefik nao deve ser publicado sem autenticacao.

## Banco de dados

O host de conexao do backend dentro do Compose e `db`, e nao `localhost`.
O acesso externo, quando necessario, usa:

```text
Host: 169.58.246.66
Porta: 3306
Banco: sollazer_piscinas
Usuario: sollazer
```

O endpoint do banco e MySQL TCP, nao HTTPS. O certificado Let\'s Encrypt dos
subdominios HTTP nao protege o handshake nativo do MySQL. Como a porta esta
publica, use senha forte, restrinja por firewall aos IPs necessarios e prefira
TLS nativo do MySQL ou tunel SSH.

Nao use `docker compose down -v` em producao: isso remove os volumes do banco,
uploads e certificados.

## Backup e restauracao

Crie um backup antes de alteracoes de schema ou operacoes destrutivas:

```bash
cd /opt/sollazer-piscinas
docker compose exec -T db mysqldump -u root -p sollazer_piscinas > backup-$(date +%F).sql
```

A senha do root deve ser digitada no prompt ou fornecida por um mecanismo
seguro, nunca gravada no historico do shell.

Para restaurar um backup validado:

```bash
cat backup-AAAA-MM-DD.sql | docker compose exec -T db mysql -u root -p sollazer_piscinas
```

Mantenha os backups fora da VPS e teste periodicamente uma restauracao.

## Diagnostico rapido

### Container parado

```bash
docker compose ps
docker compose logs --tail 100 NOME_DO_SERVICO
docker compose up -d --build NOME_DO_SERVICO
```

### API retorna erro de banco

```bash
docker compose ps db
docker compose logs --tail 100 db
docker compose exec backend getent hosts db
docker compose restart backend
```

Confirme que o banco esta `healthy` antes de reiniciar o backend.

### Certificado nao foi emitido

Confirme que os DNS resolvem para a VPS e que as portas 80 e 443 estao livres:

```bash
getent hosts sollazerpiscina.com.br www.sollazerpiscina.com.br
ss -lntp | grep -E ':(80|443)\\b'
docker compose logs --tail 200 traefik
```

### Voltar para o commit anterior

```bash
cd /opt/sollazer-piscinas
git log --oneline -5
git checkout <COMMIT_ESTAVEL> -- .
docker compose up -d --build
```

Para uma reversao permanente, prefira criar um commit de revert no GitHub em
vez de reescrever a branch `main`.

## Comandos locais

Com Docker Desktop instalado, na raiz do projeto:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

A loja local fica em `http://localhost:8080`. Para parar os containers sem
remover dados:

```bash
docker compose down
```

Para remover tambem banco, uploads e certificados locais, use `down -v` apenas
em ambiente de desenvolvimento.
