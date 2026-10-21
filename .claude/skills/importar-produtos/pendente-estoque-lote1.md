# Importação do estoque completo — status em 2026-10-21

Contexto: Alcei colou o estoque completo da loja (PDF extraído, ~289 linhas).
Depois de tirar ração/sachê (6 itens) e os que já existiam no catálogo (36
itens), sobraram **247 itens** pra processar (241 com preço + 6 com preço
zerado que ele autorizou cadastrar mesmo assim, inativando depois se
precisar). Ele confirmou duas vezes: "pode adicionar os que estao sem
preco... esses eu posso fazer manualmente" e depois "pode fazer todos".

## Já inserido no banco (108 itens — lotes 1,2,3,4,5,9)

Inserido em produção em 2026-10-21 via
`insert_estoque_lote1.sql` (324 linhas = 108 produtos x 3 cidades), com
backup prévio em `/opt/sollazer-piscinas-backup-pre-estoque-lote1.sql` na
VPS. Todos com `tipo_acao='carrinho'`, `estoque=0`, descrição curta
(gerada por template a partir do nome/marca/categoria — não é ficha
técnica pesquisada item a item, por limite de tempo/contexto da sessão).

- **19 itens com imagem real** pesquisada na internet (Sodramar, Jacuzzi,
  QClor, Brustec, Syllent, Hidroall — produto certo confirmado pelo nome
  do arquivo/fonte) → `ativo = TRUE`.
- **89 itens sem imagem real encontrada** → `ativo = FALSE` e
  `imagem_url` apontando pro placeholder cinza
  `/assets/uploads/1792608053480-fcd5608625ebff7b.webp` ("Imagem em
  breve"). Alcei pode ativar cada um no painel depois de subir a foto
  real, ou deixar como está.

## Ainda NÃO inserido — 139 itens (lotes 6,7,8,10,11,12,13,14)

Um agente em background (task id `a9de05391bb1b2763`, nome "Pesquisa
estoque lote 6/14 (retry)") pode estar processando o lote 6 nessa
sessão/outra — **checar se ele já terminou antes de reprocessar lote 6**.
Lotes 7, 8 também podem ter sido lançados em background na sessão
anterior — checar notificações pendentes antes de relançar.
Lotes 10–14 **nunca foram relançados** depois do rate-limit inicial — são
os únicos 100% pendentes do zero.

Itens brutos (nome | marca | preço), extraídos do PDF, prontos pra
pesquisa de descrição/imagem (mesmo processo do `SKILL.md`):

### Lote 6
```
CLORO GENCO CONCENTRADO 10KG 56% CLORO ATIVO | Genco | 309.99
CLORO HIDROSAN PENTA 10KG | ? | 215.00
CLORO HTH TRADICIONAL 10KG 65% CLORO ATIVO | HTH | 475.00
CONJUNTO CORPO-PRE BOMBA A JACUZZI | Jacuzzi | 665.00
CONJUNTO CORPO-PRE BOMBA B JACUZZI | Jacuzzi | 725.00
CONJUNTO CORPO-PRE BOMBA SODRAMAR | Sodramar | 220.00
CONTROL LOGICO PROGRAMADOR | ? | 425.00
CONTROLADOR DIGITAL TEMPERATURA MMZ1195N-220VCA | ? | 426.00
CONTROLADORA BRUSTEC | Brustec | 771.00
CONTROLADORA LUXPOOL | ? | 425.00
CORPO PLASTICO P/BOMBA SODRAMAR | Sodramar | 220.75
CREPINA FILTRO TP15 | ? | 100.00
CREPINA JACUZZI GRANDE | Jacuzzi | 48.95
CREPINA JACUZZI MEDIA | Jacuzzi | 27.00
CREPINA JACUZZI PEQUENA | Jacuzzi | 20.00
CREPINA SODRAMAR COM FURO | Sodramar | 32.00
CREPINA SODRAMAR SEM FURO | Sodramar | 32.00
CV CORPO VISOR/VALVULA VS6CF15 | ? | 450.00
```

### Lote 7
```
DESVIADOR JACUZZI | Jacuzzi | 165.00
DESVIADOR SODRAMAR | Sodramar | 145.00
DISPOSITIVO ASPIRAÇÃO DA50-18 INOX | ? | 148.00
DISPOSITIVO ASPIRÇÃO PRATIC 50MM C/ADAPTADOR | ? | 79.99
DISPOSITIVO DE ASPIRACAO PRATIC 50M SODRAMAR C/ADAPTA | Sodramar | 79.00
DISPOSITIVO DE ASPIRAÇÃO VF-15 | ? | 135.00
DISPOSITIVO DE RETORNO JACUZZI CF-15 | Jacuzzi | 209.99
Dispositivo Extravasor De50-18 Inox Jacuzzi | Jacuzzi | 125.00
DISPOSITIVO HIDRO | ? | 439.99
DISPOSITIVO HIDROMASSAGEM PRATIC SODRAMAR | Sodramar | 135.00
DISPOSITIVO RETORNO BR50-18 INOX | ? | 68.00
DISPOSITIVO RETORNO PRATC 50MM SODRAMAR | Sodramar | 79.00
DISPOSITIVO RETORNO PRATIC 50M SODRAMAR | Sodramar | 158.00
DISTRIBUIDOR FILTRO JACUZZI | Jacuzzi | 128.00
DISTRIBUIDOR P/CREPINA SODRAMAR | Sodramar | 110.00
DRENO FUNDO 15x15 C/ TAMPA FSB PRATA SODRAMAR | Sodramar | 240.00
EMENDA DA MANGUEIRA | ? | 28.90
ESCOVA AÇO INOX SODRAMAR | Sodramar | 135.00
```

### Lote 8
```
ESCOVA BRUSTEC | Brustec | 39.99
ESCOVA CURVA LIGHT TECH | Light Tech | 52.00
ESCOVA CWB450 JACUZZI | Jacuzzi | 55.00
ESCOVA NYLON CURVA SODRAMAR | Sodramar | 60.00
ESCOVA NYLON RETA 33CM SODRAMAR | Sodramar | 56.99
ESTOJO DE TESTES 3 EM 1 GENCO | Genco | 118.00
FILTRO JACUZZI 42FC C/VALVULA | Jacuzzi | 29700.00
FILTRO JACUZZI TP 12 ATE 26ML (1SC AREIA) | Jacuzzi | 885.00
FILTRO JACUZZI TP 15 ATE 53ML (2SC AREIA) | Jacuzzi | 1129.99
FILTRO JACUZZI TP 19 ATE 92ML (5SC AREIA) | Jacuzzi | 1559.99
FILTRO JACUZZI TP 30 | Jacuzzi | 3495.00
FILTRO JACUZZI TP22 (6SC AREIA) | Jacuzzi | 1959.99
FILTRO JACUZZI TP26 144 ML (8SC AREIA) | Jacuzzi | 2835.00
FILTRO SODRAMAR FM 40 50MIL | Sodramar | 865.00
FILTRO SODRAMAR FM 50 78MIL | Sodramar | 1275.00
FILTRO SODRAMAR FM 60 113MIL | Sodramar | 1595.00
FILTRO SODRAMAR FM 75 | Sodramar | 1945.00
FILTRO SODRAMAR FVP-140 COMPLETO | Sodramar | 23850.00
```
(Atenção: `FILTRO JACUZZI 42FC C/VALVULA` a R$29.700 e `FILTRO SODRAMAR
FVP-140 COMPLETO` a R$23.850 têm preço muito alto — conferir com o Alcei
se não é erro de extração do PDF antes de cadastrar, igual foi sinalizado
o `TROCADOR DE CALOR` do lote 14 abaixo.)

### Lote 10
```
KIT ESCO | ? | 0.00
KIT SELETOR PLASTICO P/VALVULA AZUL COMPLETO | ? | 180.00
KIT SODRAMAR LIMPEZA PISCINA | Sodramar | 0.00
KIT TESTE ALCALINIDADE HIDROALL | Hidroall | 65.00
KIT TESTE ALCALINIDADE QCLOR | QClor | 55.79
KIT TESTE CL/PH GENCO | Genco | 70.00
KIT TESTE CLORO E PH PACE | Pace | 48.00
KIT TESTE CLORO E PH QCLOR | QClor | 55.00
KIT TESTE PH/CLORO HIDROALL | Hidroall | 55.00
LAMPADA 15W RGB | ? | 315.00
LAMPADA 9W RGB | ? | 220.00
LAMPADA HIP LED 6W RGB INOX 316L | ? | 220.00
LAMPADA HIPER LED 6W AZUL BRUSTEC | Brustec | 139.99
LAMPADA LED 9W BRANCA | ? | 175.00
LIGHT TECH TINY LED 10WATTS | Light Tech | 449.99
LIMPA BORDAS 1L HIDROALL | Hidroall | 25.50
LUVA PASTICA 1 1/2 SODRAMAR | Sodramar | 0.00
LUVA PLAST. P/ DA PRATIC 50MM | ? | 0.00
```

### Lote 11
```
LUVA PLASTICA 1 1/2 SODRAMAR | Sodramar | 23.50
LUVA PLASTICA PARA DA PRATIC 50MM | ? | 22.00
MANGUEIRA AMARELA JACUZZI | Jacuzzi | 38.75
MANGUEIRA AZUL BRYSA MT | Brysa | 19.50
MANGUEIRA ECOLOGICA | ? | 13.00
MANGUEIRA SILICONADA | ? | 22.00
Mola Da Válvula Seletora Filtros Tp/cfa Jacuzzi + Arruelas | Jacuzzi | 65.00
MONOMETRO JACUZZI | Jacuzzi | 132.00
PAINEL DIGITAL P/TROCADOR DE CALOR | ? | 500.00
PENEIRA + FLEX | ? | 45.00
PENEIRA BRUSTEC MINI | Brustec | 25.00
PENEIRA CATA FOLHA SODRAMAR PLASTICO | Sodramar | 68.00
PENEIRA JACUZZI GRANDE | Jacuzzi | 69.99
PENEIRA JACUZZI PROFUNDA | Jacuzzi | 138.00
PENEIRA PLASTICO PELICANO BRUSTEC | Brustec | 120.00
PENEIRA PLÁSTICA BRUSTEC | Brustec | 45.00
PENEIRA TIPO PUCA ARMAÇÃO METALICA SODRAMAR | Sodramar | 55.00
PH CERTO HIDROALL ELEVAR ALCALINIDADE | Hidroall | 39.99
```

### Lote 12
```
PONTEIRA PARA MANGUEIRA SODRAMAR DE 1/2 | Sodramar | 22.00
PRESSURIZADOR 1/2CV MONO JACUZZI 220V | Jacuzzi | 2450.00
PRESSURIZADOR 1CV MONO JACUZZI 220V | Jacuzzi | 2699.00
PRESSURIZADOR JACUZZI 1/2 CV MONOFASICO | Jacuzzi | 2225.00
RALO DE FUNDO LATÃO 15CM X 15CM X 15CM X 2 | ? | 240.00
RALO DE FUNDO LATÃO SODRAMAR | Sodramar | 795.00
RALO ENCAIXE | ? | 170.00
RALO ENCAIXE INAQUA 50MM | ? | 150.00
RALO INAQUA | ? | 185.00
RALO QUEBRA ONDAS INOX 1 1/2 SODRAMAR | Sodramar | 115.00
REAGENTE AT1 | ? | 18.00
REAGENTE AT1+FLEX | ? | 13.00
REAGENTE AT2 | ? | 18.00
REAGENTE AT2 +FLEX | ? | 13.00
REAGENTE CL-OT GENCO | Genco | 16.00
REAGENTE CLORO +FLEX | ? | 12.00
REAGENTE CLORO HIDROALL | Hidroall | 12.90
REAGENTE CLORO PACE | Pace | 0.00
```

### Lote 13
```
REAGENTE PH +FLEX | ? | 12.00
REAGENTE PH GENCO | Genco | 17.00
REAGENTE PH HIDROALL | Hidroall | 14.90
REAGENTE PH PACE | Pace | 0.00
REFLETOR 6W RGB RESINADO 70MM | ? | 165.00
REFLETOR BRANCO FRIO INOX 10W 72mm LIGHT TECH | Light Tech | 449.99
SAL 25kg | ? | 39.99
SERRA | ? | 14.18
SULFATO DE ALUMINIO QCLOR 2KG | QClor | 22.00
SUPER TRATAMENTO SEMANAL GENCO 400G | Genco | 33.00
TABLET GENCO 3 EM 1 200GR | Genco | 15.50
TABLET HIDROALL HCL200 200G | Hidroall | 12.75
TABLET PACE | Pace | 13.50
TABLET QCLOR AÇÃO 10EM1 200G | QClor | 10.90
TABLETE GENCO CONCENTRADO 200G | Genco | 15.50
TAMPA BRANCA P/DISP ASPIRAÇÃO 1.1/2 | ? | 25.00
Tampa dispositivo de aspiração cano rosca 1 1/2 50mm | ? | 22.00
TAMPA P/DRENO ALTA VAZÃO FSB | ? | 155.00
```

### Lote 14 (13 itens)
```
TAMPA PRE FILTRO BOMBA SODRAMAR | Sodramar | 67.75
TAMPA PRE-FILTRO B JACUZZI | Jacuzzi | 220.00
TAMPA VALVULA VS6TP15 C/ETIQUETA | ? | 190.00
TIMER EXBOM | ? | 100.00
TRAVA RAPIDA 1 1/4 | ? | 28.00
TROCADOR DE CALOR 180.000 BTU | ? | 28.00
TROCADOR DE CALOR 180.000 BTU SODRAMAR | Sodramar | 38499.00
ULTRAVIOLETA 18 | ? | 1649.99
ULTRAVIOLETA 5.5 | ? | 1280.00
UNIAO SOLD 50MM | ? | 39.19
VALVULA SELETORA P/ 1 MONOMETRO JACUZZI | Jacuzzi | 835.00
VALVULA SELETORA P/2 MONOMETRO JACUZZI | Jacuzzi | 985.00
VALVULA SELETORA SODRAMAR | Sodramar | 525.00
```
(`TROCADOR DE CALOR 180.000 BTU SODRAMAR` a R$38.499 também parece
preço de extração bugada do PDF — mesmo trocador aparece acima, no lote
8, a R$28,00 sem marca. Provável que R$28,00 esteja errado e R$38.499
seja o certo, ou vice-versa — **perguntar ao Alcei** antes de cadastrar
qualquer um dos dois.)

## Próximo passo (próxima sessão)

1. Checar se o agente em background (`a9de05391bb1b2763`) e outros lotes
   7/8 já retornaram resultado — não relançar pesquisa se já tiver.
2. Pesquisar descrição+imagem dos 139 itens acima (mesmo processo do
   `SKILL.md`, passo 3) — forks em lotes pequenos (3-4 por vez) pra evitar
   rate limit.
3. Perguntar ao Alcei sobre os 2 preços suspeitos (filtros de R$23-30 mil
   no lote 8, trocador de calor R$28 vs R$38.499 no lote 14).
4. Gerar o INSERT (mesmo padrão de `gerar_sql_estoque.py`), com backup
   antes, aplicar, validar.
5. Atualizar `cidades-multi-loja.md` com o resultado final (hoje: 140
   produtos/cidade, 108 novos deste lote + 32 que já existiam).
