/* =========================================================
   SOLLAZER PISCINAS — vitrine.js
   Grupos de produto compartilhados entre a loja (js/app.js)
   e o painel do funcionário (admin/dashboard.js), pra os dois
   mostrarem exatamente as mesmas categorias, na mesma ordem.
   ========================================================= */

function normalizarTexto(texto) {
  return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function getProductCategory(category) {
  const normalized = normalizarTexto(category).trim();
  if (normalized === 'cloro' || normalized === 'cloros') return 'Cloros';
  if (normalized.includes('bomba') || normalized.includes('filtro')) return 'Bombas e Filtros';
  if (normalized.includes('quimic')) return 'Produtos Químicos';
  if (!normalized) return 'Diversos';
  return category.trim();
}

// "10kg" / "10 kg" sem pegar "100kg" nem "4,5kg".
function temPeso(nome, kg) {
  return new RegExp(`(^|[^\\d,])${kg}\\s*kg`).test(nome);
}

// Ordem da vitrine, a pedido do dono da loja: os itens que mais
// saem primeiro. Cada produto cai no PRIMEIRO grupo que bater
// (ex.: o "Ultra Clear", algicida + clarificante, fica em Clarificantes).
// O que não bate em nenhum vem depois, agrupado pela categoria do cadastro.
const GRUPOS_VITRINE = [
  { nome: 'Baldes de Cloro 10kg', bate: (p, nome) => p.cloro && temPeso(nome, 10) },
  { nome: 'Baldes de Cloro 50kg', bate: (p, nome) => p.cloro && temPeso(nome, 50) },
  { nome: 'Clarificantes', bate: (p, nome) => nome.includes('clarific') || nome.includes('floc') },
  { nome: 'Algicidas de Choque', bate: (p, nome) => nome.includes('algicida') && nome.includes('choque') },
  { nome: 'Algicidas de Manutenção', bate: (p, nome) => nome.includes('algicida') },
  { nome: 'Barrilhas', bate: (p, nome) => nome.includes('barrilha') },
  { nome: 'pH Certo', bate: (p, nome) => nome.includes('ph certo') },
  { nome: 'Limpa Bordas', bate: (p, nome) => nome.includes('limpa borda') },
  { nome: 'Tabletes de Cloro', bate: (p, nome) => p.cloro && (nome.includes('tablete') || nome.includes('pastilha')) },
  { nome: 'Outros Cloros', bate: p => p.cloro },
  { nome: 'Outros Produtos Químicos', bate: p => p.categoria === 'Produtos Químicos' }
];

function grupoVitrine(produto) {
  const categoria = getProductCategory(produto.categoria);
  const info = { categoria, cloro: categoria === 'Cloros' };
  const nome = normalizarTexto(produto.nome);
  const indice = GRUPOS_VITRINE.findIndex(grupo => grupo.bate(info, nome));
  return indice === -1
    ? { indice: GRUPOS_VITRINE.length, nome: categoria }
    : { indice, nome: GRUPOS_VITRINE[indice].nome };
}

// sort() é estável: dentro de cada grupo a ordem original é mantida.
function ordenarVitrine(produtos) {
  return [...produtos].sort((a, b) => {
    const ga = grupoVitrine(a);
    const gb = grupoVitrine(b);
    return ga.indice - gb.indice || (ga.indice === GRUPOS_VITRINE.length ? ga.nome.localeCompare(gb.nome, 'pt-BR') : 0);
  });
}
