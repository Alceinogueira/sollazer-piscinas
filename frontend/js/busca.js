/* =========================================================
   SOLLAZER PISCINAS — busca.js
   Busca da vitrine tolerante ao jeito que o cliente digita:
   sem acento, com erro de digitação ("clorro", "pissina",
   "alguicida") e com palavras do dia a dia ("água verde",
   "pastilha", "turva"). Depende de normalizarTexto/grupoVitrine
   (js/vitrine.js).
   ========================================================= */

// Palavras que não ajudam a achar produto (e "piscina", que está em quase todo nome).
const BUSCA_IGNORAR = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'pra', 'pro', 'p', 'com', 'o', 'a', 'os', 'as', 'e', 'em', 'na', 'no', 'um', 'uma', 'piscina', 'piscinas', 'produto', 'produtos', 'quero', 'preciso']);

// Termos do cliente -> termos que aparecem nos produtos. A chave é
// comparada já "normalizada" e com tolerância a erro, igual às demais.
const BUSCA_SINONIMOS = {
  pastilha: ['tablete'], pastilhas: ['tablete'], tablete: ['pastilha'], tabletes: ['pastilha'], tablet: ['tablete', 'pastilha'],
  verde: ['algicida', 'choque'], alga: ['algicida'], algas: ['algicida'], limo: ['algicida'],
  turva: ['clarificante', 'floc'], turvo: ['clarificante', 'floc'], leitosa: ['clarificante'], esbranquicada: ['clarificante'],
  decantador: ['sulfato', 'floc', 'clarificante'], decantar: ['sulfato', 'floc', 'clarificante'],
  barrilha: ['ph+', 'elevador'], alcalinidade: ['alcalinizante', 'elevador'],
  oleo: ['oleosidade'], gordura: ['oleosidade'], protetor: ['oleosidade'],
  ferrugem: ['metais'], mancha: ['metais'], manchas: ['metais'], metal: ['metais'],
  luz: ['led', 'refletor'], lampada: ['led', 'refletor'], iluminacao: ['led', 'refletor'],
  aspirador: ['aspiracao'], aspirar: ['aspiracao'], puca: ['peneira'],
  teste: ['reagente', 'estojo', 'kit'], medir: ['reagente', 'estojo', 'teste'],
  bomba: ['pressurizador'], motor: ['bomba'],
  sal: ['salino'], borda: ['bordas'], bordas: ['borda'],
  // pH: "abaixar" é o PH Menos; "subir" são os elevadores/barrilha.
  abaixar: ['menos'], baixar: ['menos'], diminuir: ['menos'], reduzir: ['menos'], redutor: ['menos'],
  subir: ['elevador', 'mais'], aumentar: ['elevador', 'mais'], elevar: ['elevador', 'mais']
};

// Une número e unidade ("10 kg" -> "10kg", "1 litro" -> "1l") pra bater com os nomes.
function normalizarBusca(texto) {
  return normalizarTexto(String(texto || '').replace(/ç/gi, 's'))
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/(\d+)\s*(kg|quilos?|kilos?)\b/g, '$1kg')
    .replace(/(\d+)\s*(l|lt|lts|litros?)\b/g, '$1l')
    .replace(/(\d+)\s*(ml|g|cv|w)\b/g, '$1$2')
    .trim();
}

// Chave "fonética" simplificada do português: escrever do jeito que se
// fala ("pissina", "clorro", "alguicida", "barilia") cai na mesma chave.
function chaveFonetica(palavra) {
  if (palavra === 'ph' || /^\d/.test(palavra)) return palavra;
  return palavra
    .replace(/(.)\1+/g, '$1')
    .replace(/sc(?=[ei])/g, 's')
    .replace(/ch/g, 'x')
    .replace(/lh/g, 'li')
    .replace(/nh/g, 'ni')
    .replace(/qu/g, 'k')
    .replace(/gu(?=[ei])/g, 'g')
    .replace(/c(?=[ei])/g, 's')
    .replace(/c/g, 'k')
    .replace(/z/g, 's')
    .replace(/y/g, 'i')
    .replace(/w/g, 'v')
    .replace(/([^p])h/g, '$1')
    .replace(/^h/, '')
    .replace(/(.)\1+/g, '$1');
}

function distanciaEdicao(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    anterior = atual;
  }
  return anterior[b.length];
}

// Quantos erros de digitação aceitar pelo tamanho da palavra.
function errosAceitos(tamanho) {
  if (tamanho <= 3) return 0;
  if (tamanho <= 5) return 1;
  return 2;
}

// Nota de 0 a 3 pra uma palavra da busca contra uma palavra do produto.
function notaPalavra(busca, produto) {
  if (busca === produto) return 3;
  if (/^\d/.test(busca)) {
    // Números só batem no começo e sem "virar" outro número (1 não acha 10kg).
    return produto.startsWith(busca) && !/^\d/.test(produto.slice(busca.length)) ? 2.5 : 0;
  }
  if (busca.length >= 2 && produto.startsWith(busca)) return 2.5;
  if (busca.length >= 4 && produto.includes(busca)) return 2;
  // Palavras grudadas ("limpabordas"): começa com uma palavra do produto.
  if (busca.length >= 7 && produto.length >= 4 && busca.startsWith(produto)) return 1.5;
  const erros = errosAceitos(busca.length);
  if (!erros) return 0;
  // Menos erros = nota maior ("penera" acha "peneira" antes de "penta").
  const distancia = distanciaEdicao(busca, produto);
  if (distancia <= erros) return 2.2 - 0.3 * distancia;
  // Ainda digitando: compara com o começo da palavra do produto.
  if (busca.length >= 4 && distanciaEdicao(busca, produto.slice(0, busca.length)) <= erros - (busca.length < 6 ? 0 : 1)) return 1.5;
  return 0;
}

const indiceBusca = new WeakMap();

function indexarProduto(produto) {
  if (!indiceBusca.has(produto)) {
    const palavras = texto => [...new Set(normalizarBusca(texto).split(' ').filter(Boolean))]
      .map(palavra => ({ texto: palavra, fonetica: chaveFonetica(palavra) }));
    indiceBusca.set(produto, {
      principal: palavras([produto.nome, produto.marca, produto.categoria, grupoVitrine(produto).nome].join(' ')),
      descricao: palavras(produto.descricao)
    });
  }
  return indiceBusca.get(produto);
}

function melhorNota(termo, palavras) {
  let melhor = 0;
  for (const palavra of palavras) {
    const fonetica = termo.texto.length >= 4 ? notaPalavra(termo.fonetica, palavra.fonetica) * 0.9 : 0;
    const nota = Math.max(notaPalavra(termo.texto, palavra.texto), fonetica);
    if (nota > melhor) melhor = nota;
    if (melhor === 3) break;
  }
  return melhor;
}

// Nota de um termo da busca no produto: nome/marca/categoria valem mais
// que a descrição; sinônimos valem um pouco menos que a palavra digitada.
function notaTermo(termo, indice) {
  const alternativas = [termo, ...termo.sinonimos];
  let melhor = 0;
  alternativas.forEach((alternativa, i) => {
    const peso = i === 0 ? 1 : 0.85;
    melhor = Math.max(melhor, melhorNota(alternativa, indice.principal) * peso, melhorNota(alternativa, indice.descricao) * peso * 0.4);
  });
  return melhor;
}

// "pissina", "pisina": também ignoradas, como "piscina".
const BUSCA_IGNORAR_FONETICA = new Set(['piscina', 'piscinas', 'produto', 'produtos'].map(chaveFonetica));

function prepararTermos(consulta) {
  return normalizarBusca(consulta).split(' ')
    .filter(palavra => palavra && !BUSCA_IGNORAR.has(palavra) && !(palavra.length >= 6 && BUSCA_IGNORAR_FONETICA.has(chaveFonetica(palavra))))
    .map(palavra => {
      const chave = Object.keys(BUSCA_SINONIMOS).find(sinonimo => sinonimo === palavra || (palavra.length >= 4 && distanciaEdicao(sinonimo, palavra) <= errosAceitos(palavra.length) - 1));
      const sinonimos = (chave ? BUSCA_SINONIMOS[chave] : []).map(s => ({ texto: s, fonetica: chaveFonetica(s) }));
      return { texto: palavra, fonetica: chaveFonetica(palavra), sinonimos };
    });
}

// Devolve os produtos que batem, do mais parecido pro menos.
// "aproximado" = nenhum produto bateu TODAS as palavras, então mostra
// os que bateram parte delas (melhor que a tela vazia).
function buscarProdutos(produtos, consulta) {
  const termos = prepararTermos(consulta);
  if (!termos.length) return { resultados: produtos, aproximado: false, termos: 0 };

  const avaliados = produtos.map((produto, ordem) => {
    const indice = indexarProduto(produto);
    const notas = termos.map(termo => notaTermo(termo, indice));
    return { produto, ordem, acertos: notas.filter(nota => nota >= 1).length, nota: notas.reduce((a, b) => a + b, 0) };
  });
  const ordenar = lista => lista.sort((a, b) => b.acertos - a.acertos || b.nota - a.nota || a.ordem - b.ordem).map(item => item.produto);

  const todos = avaliados.filter(item => item.acertos === termos.length);
  if (todos.length) return { resultados: ordenar(todos), aproximado: false, termos: termos.length };
  return { resultados: ordenar(avaliados.filter(item => item.acertos > 0)), aproximado: true, termos: termos.length };
}
