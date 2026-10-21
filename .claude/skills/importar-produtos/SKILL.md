---
name: importar-produtos
description: Cadastra em massa uma lista de produtos (nome + preço) da Sollazer Piscinas nas 3 cidades (Trancoso, Eunápolis, Arraial D'Ajuda) — pesquisa descrição e imagem reais na internet, categoriza, evita duplicar produtos já cadastrados, e grava direto no banco de produção via SSH/MySQL. Use quando o usuário colar uma lista de produtos pra adicionar na loja, pedir pra "importar produtos", "cadastrar a lista", ou mencionar que vai mandar "o total de produtos da loja".
---

# Importar produtos em massa — Sollazer Piscinas

Processo criado em 2026-10-21, a pedido do dono da loja (Alcei), pra repetir
sempre que ele mandar uma lista nova de produtos (nome + preço, uma linha
cada). Ele faz isso com frequência — não pedir confirmação de cada etapa,
só seguir o processo e reportar o resultado no final.

## 0. Acesso à infraestrutura (já configurado, não precisa pedir nada)

- VPS: `root@169.58.246.66`, chave SSH em `~/.ssh/id_ed25519` (sem senha).
- Stack em `/opt/sollazer-piscinas` (docker compose). `.env` na VPS tem
  `MYSQL_ROOT_PASSWORD` e `DB_PASSWORD` — sempre `source .env` antes de
  qualquer comando mysql.
- Banco: serviço `db` do compose, banco `sollazer_piscinas`, tabela
  `produtos` (colunas: nome, descricao, marca, categoria, cidade, preco,
  estoque, imagem_url, imagens, tipo_acao, ativo — ver
  `backend/database.sql` no repo local pra conferir o schema atual).
- Volume de uploads (onde ficam as imagens): volume Docker
  `sollazer-piscinas_uploads`, mountpoint no host =
  `/var/lib/docker/volumes/sollazer-piscinas_uploads/_data/` — dá pra
  copiar arquivo ali direto com `scp`, sem precisar do endpoint HTTP de
  upload nem de login no painel admin (não peça senha do admin pra isso).
- Cidades válidas (exatamente esses valores, minúsculo): `trancoso`,
  `eunapolis`, `arraial_dajuda`.

## 1. Receber e interpretar a lista

O Alcei cola uma lista tipo:
```
nome do produto X,XX
outro produto preço
...
```
Formato é solto — preço pode vir com `-` antes, quebra de linha entre nome
e preço, `R$`, separador de milhar com ponto (`1.149,99`). Interprete item
por item com bom senso; se um preço ficar ambíguo, pergunte antes de
assumir (preço errado em produção é pior que perguntar uma vez).

## 2. Checar o que já existe (NÃO duplicar)

Antes de pesquisar/cadastrar qualquer coisa, rode no banco (via SSH):
```bash
docker compose exec -T db mysql -u root -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 -N \
  -e "SELECT DISTINCT nome FROM sollazer_piscinas.produtos ORDER BY nome;"
```
Compare cada item da lista nova com os nomes existentes por semelhança
(normalize: minúsculo, sem acento, ignore marca/volume na comparação
grosseira, veja se o "miolo" do nome bate — ex. "cloro super ação 1kg" da
lista bate com "Cloro Granulado Super Ação Qclor 1kg" já cadastrado).

- Bate com alta confiança -> **pula** esse item, não recadastra.
- Não bate com nada -> é novo, processa normalmente (passo 3+).
- Ficar em dúvida (nome parecido mas pode ser produto diferente, ex.
  gramatura diferente) -> lista o caso pro usuário decidir, não adivinha.

No final, reporte pro usuário: quantos itens da lista já existiam (pulados)
e quantos foram cadastrados como novos.

## 3. Pesquisar descrição + imagem dos itens novos

Pra cada item realmente novo, usar pesquisa na internet pra achar:
- **Nome comercial completo** (com marca), no padrão dos produtos reais já
  no catálogo (ex.: "Cloro Granulado 10kg Qclor Super Ação Para Piscinas").
- **Descrição longa**, estilo ficha técnica: o que é, pra que serve, modo
  de uso/dosagem, especificações, cuidados — mesmo tom dos produtos reais
  (puxar 1-2 exemplos do banco com `SELECT nome, descricao FROM produtos
  WHERE descricao IS NOT NULL LIMIT 3` pra recalibrar o padrão a cada
  rodada, caso o estilo mude).
- **Imagem real do produto**: uma URL DIRETA de arquivo de imagem (não
  página HTML), preferindo fabricante/distribuidor ou grandes varejistas
  (Mercado Livre, Amazon, lojas de piscina).
- **Categoria**: `Cloros` (cloro/tablete/pastilha), `Produtos Químicos`
  (algicida, clarificante, pH, removedor, limpador), `Bombas e Filtros`
  (peneira, bomba, filtro, mangueira, equipamento), ou `Diversos` se não
  encaixar em nenhuma (essas são as únicas 4 que o filtro da loja
  reconhece — ver `getProductCategory()` em `frontend/js/app.js`).

**Paralelize com forks** (Agent, subagent_type="fork") em lotes de ~5
produtos cada, rodando ao mesmo tempo (uma mensagem, várias chamadas) —
isso evita que a pesquisa de 15-20 produtos lote o contexto principal.
Cada fork devolve um bloco estruturado por produto (nome/marca/descrição/
imagem_url/fonte) — não deixar o fork tocar no banco nem na VPS, só
pesquisa.

## 4. Baixar, conferir e comprimir as imagens

Pra cada imagem encontrada:
```bash
curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36" -m 25 -o arquivo.bin "URL"
file -b --mime-type arquivo.bin   # confere que baixou imagem de verdade, não HTML de erro
```
Renomear com a extensão certa, e **olhar a imagem com a ferramenta Read**
antes de usar — confirma visualmente que é o produto certo (embalagem,
marca, tipo), não um produto errado ou uma página quebrada.

Comprimir com `cwebp`, **nunca fazendo upscale** (checar largura original
com `sips -g pixelWidth` antes — só usar `-resize 900 0` se a original for
maior que 900px de largura; senão, comprimir no tamanho original):
```bash
cwebp -q 82 [-resize 900 0 , só se original > 900px largura] origem.ext -o saida.webp
```

Nomear cada arquivo final exatamente como o backend nomeia um upload real
(ver `backend/routes/uploads.admin.js`): `<timestamp_em_ms>-<16 hex>.webp`.
Gerar isso em Python (`int(time.time()*1000)` + `secrets.token_hex(8)`), um
timestamp distinto por arquivo (não gerar todos no mesmo milissegundo).

## 5. Subir as imagens pra VPS

```bash
scp -o BatchMode=yes -i ~/.ssh/id_ed25519 *.webp root@169.58.246.66:/var/lib/docker/volumes/sollazer-piscinas_uploads/_data/
```
Confirmar que ficou acessível publicamente depois do deploy:
`curl -o /dev/null -w "%{http_code}" https://sollazerpiscina.com.br/assets/uploads/<arquivo>.webp` (espera 200).

## 6. Gravar no banco (produto x 3 cidades)

Gerar um script Python local que escapa aspas/barras corretamente e
escreve um arquivo `.sql` com um único `INSERT INTO produtos (nome,
descricao, marca, categoria, cidade, preco, estoque, imagem_url,
tipo_acao, ativo) VALUES (...), (...), ...;` — uma linha de VALUES por
produto **x** cada uma das 3 cidades (mesmo produto/preço nas 3, a não ser
que o usuário peça preço diferente por cidade). Usar
`tipo_acao='carrinho'`, `ativo=TRUE`, `estoque=0` como padrão (a não ser
que o usuário informe outra coisa).

Antes de aplicar, **sempre fazer backup**:
```bash
cd /opt/sollazer-piscinas && set -a && source .env && set +a
docker compose exec -T db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" sollazer_piscinas > /opt/sollazer-piscinas-backup-pre-<descricao>.sql
```
Depois copiar o `.sql` gerado pra VPS e aplicar:
```bash
docker compose exec -T db mysql -u root -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 sollazer_piscinas < arquivo.sql
```

## 7. Validar

```bash
for c in trancoso eunapolis arraial_dajuda; do
  curl -s "https://sollazerpiscina.com.br/api/produtos?cidade=$c" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))"
done
```
Conferir contagem igual nas 3 cidades, e espiar pelo menos 1 produto novo
pela API pública (nome/preço/categoria/imagem acessível) antes de reportar
sucesso pro usuário.

## 8. Reportar e atualizar memória

No final, resuma pro usuário: quantos itens vieram na lista, quantos já
existiam (pulados), quantos foram cadastrados, e qualquer caso duvidoso
que precisou da decisão dele. Atualizar a memória do projeto
(`cidades-multi-loja.md` ou equivalente) com o que mudou.
