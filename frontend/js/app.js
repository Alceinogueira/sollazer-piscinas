/* =========================================================
   SOLLAZER PISCINAS — app.js
   JavaScript puro (sem frameworks).
   Responsável por:
   1. Buscar produtos na API (rota pública)
   2. Renderizar os cards de produto
   3. Gerenciar o carrinho com LocalStorage
   4. Abrir/fechar menu mobile e carrinho lateral
   ========================================================= */

// ---------------------------------------------------------
// CONFIGURAÇÃO
// ---------------------------------------------------------
// Ajuste esta URL para o endereço real do seu backend em produção.
const API_BASE_URL = window.SOLLAZER_API_BASE_URL || 'http://localhost:3000/api';

// ---------------------------------------------------------
// CIDADE SELECIONADA
// Cada cidade tem catálogo e preços próprios — o cliente escolhe
// antes de ver a loja (tela cheia em #cityGate). A escolha fica
// salva no navegador e também entra na URL (?cidade=...) pra dar
// pra compartilhar/favoritar o link já na cidade certa.
// ---------------------------------------------------------
const CIDADES = { trancoso: 'Trancoso', eunapolis: 'Eunápolis', arraial_dajuda: "Arraial D'Ajuda" };
const CIDADE_STORAGE_KEY = 'sollazer_cidade';

function getCidade() {
  return localStorage.getItem(CIDADE_STORAGE_KEY);
}

function setCidade(cidade) {
  localStorage.setItem(CIDADE_STORAGE_KEY, cidade);
  const url = new URL(window.location.href);
  url.searchParams.set('cidade', cidade);
  window.history.replaceState({}, '', url);
}

// ---------------------------------------------------------
// ESTADO DO CARRINHO (persistido em LocalStorage, um por cidade —
// produtos e preços são diferentes entre elas, então o carrinho
// de Trancoso não pode aparecer pro cliente que está em Eunápolis).
// ---------------------------------------------------------
function cartStorageKey() {
  return `sollazer_cart_${getCidade() || 'geral'}`;
}

function getCart() {
  const raw = localStorage.getItem(cartStorageKey());
  return raw ? JSON.parse(raw) : [];
}

function saveCart(cart) {
  localStorage.setItem(cartStorageKey(), JSON.stringify(cart));
  renderCart();
}

function addToCart(product, quantity) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      nome: product.nome,
      preco: product.preco,
      imagem: product.imagem,
      tipo_acao: product.tipo_acao, // 'carrinho' ou 'orcamento'
      quantity
    });
  }
  saveCart(cart);
}

// ---------------------------------------------------------
// ADIÇÃO RÁPIDA
// Antes do 1º produto, tocar no card abre os detalhes. Depois que o
// carrinho tem algo, tocar no card já adiciona — o cliente vai
// escolhendo sem precisar abrir e fechar o carrinho a cada item.
// ---------------------------------------------------------
let ultimoAdicionado = null; // pra "Desfazer" um toque sem querer
let toastTimer;

function adicionarComAviso(produto, quantity) {
  const eraPrimeiro = getCart().length === 0;
  addToCart(produto, quantity);
  ultimoAdicionado = { id: produto.id, quantity };
  mostrarAvisoCarrinho(produto, quantity, eraPrimeiro);
  const card = document.querySelector(`.product-card[data-id="${produto.id}"]`);
  if (card) {
    card.classList.remove('is-added');
    void card.offsetWidth; // reinicia a animação se tocar duas vezes seguidas
    card.classList.add('is-added');
  }
}

function mostrarAvisoCarrinho(produto, quantity, eraPrimeiro) {
  const toast = document.getElementById('cartToast');
  clearTimeout(toastTimer);
  toast.classList.toggle('is-first', eraPrimeiro);
  document.getElementById('cartToastText').textContent = eraPrimeiro
    ? `✓ ${produto.nome} foi para o carrinho. Agora é só tocar nos outros produtos para ir adicionando.`
    : `✓ ${quantity > 1 ? `${quantity}x ` : ''}${produto.nome} adicionado.`;
  document.getElementById('cartToastUndo').hidden = eraPrimeiro;
  document.getElementById('cartToastContinue').hidden = !eraPrimeiro;
  toast.hidden = false;
  // O 1º fica até o cliente escolher; os seguintes somem sozinhos.
  if (!eraPrimeiro) toastTimer = setTimeout(esconderAvisoCarrinho, 3500);
}

function esconderAvisoCarrinho() {
  clearTimeout(toastTimer);
  document.getElementById('cartToast').hidden = true;
}

document.getElementById('cartToastContinue').addEventListener('click', esconderAvisoCarrinho);
document.getElementById('cartToastFinish').addEventListener('click', () => { esconderAvisoCarrinho(); openCart(); });
document.getElementById('cartToastUndo').addEventListener('click', () => {
  if (ultimoAdicionado) {
    const item = getCart().find(i => String(i.id) === String(ultimoAdicionado.id));
    if (item) updateCartQuantity(item.id, item.quantity - ultimoAdicionado.quantity);
    ultimoAdicionado = null;
  }
  esconderAvisoCarrinho();
});

// Selo "✓ 2" nos cards que já estão no carrinho + dica acima da grade.
function atualizarCardsNoCarrinho() {
  const cart = getCart();
  document.getElementById('quickAddHint').hidden = cart.length === 0;
  document.querySelectorAll('.product-card[data-id]').forEach(card => {
    const item = cart.find(i => String(i.id) === card.dataset.id);
    const badge = card.querySelector('.product-card__in-cart');
    badge.hidden = !item;
    if (item) badge.textContent = `✓ ${item.quantity}`;
  });
}

function removeFromCart(productId) {
  const cart = getCart().filter(item => String(item.id) !== String(productId));
  saveCart(cart);
}

function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find(item => String(item.id) === String(productId));
  if (!item) return;

  if (quantity < 1) {
    removeFromCart(productId);
    return;
  }
  item.quantity = quantity;
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(cartStorageKey());
  renderCart();
}

// ---------------------------------------------------------
// FORMA DE PAGAMENTO
// À vista (Pix, dinheiro, débito) ganha 5% de desconto; crédito
// divide em até 3x sem juros. A escolha vai pronta no orçamento.
// ---------------------------------------------------------
const FORMAS_PAGAMENTO = {
  pix: { nome: 'Pix', aVista: true },
  dinheiro: { nome: 'Dinheiro', aVista: true },
  debito: { nome: 'Cartão de débito', aVista: true },
  credito: { nome: 'Cartão de crédito', aVista: false }
};
const DESCONTO_A_VISTA = 0.05;
const MAX_PARCELAS = 3;

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

function getFormaPagamento() {
  return document.querySelector('input[name="pagamento"]:checked')?.value || null;
}

function calcularTotais(subtotal) {
  const forma = getFormaPagamento();
  const desconto = forma && FORMAS_PAGAMENTO[forma].aVista ? arredondar(subtotal * DESCONTO_A_VISTA) : 0;
  const total = arredondar(subtotal - desconto);
  const parcelas = forma === 'credito' ? Number(document.getElementById('cartInstallments').value) || 1 : 1;
  return { forma, subtotal, desconto, total, parcelas, valorParcela: arredondar(total / parcelas) };
}

function renderPagamento(totais) {
  document.getElementById('cartPayment').hidden = false;
  document.getElementById('cartPayment').classList.toggle('is-missing', false);
  document.getElementById('cartDiscountRow').hidden = !totais.desconto;
  document.getElementById('cartDiscount').textContent = `- ${formatBRL(totais.desconto)}`;

  // Opções de parcela sempre recalculadas pro total atual do carrinho.
  const select = document.getElementById('cartInstallments');
  select.innerHTML = Array.from({ length: MAX_PARCELAS }, (_, i) => i + 1)
    .map(n => `<option value="${n}"${n === totais.parcelas ? ' selected' : ''}>${n}x de ${formatBRL(arredondar(totais.total / n))} sem juros</option>`).join('');
  document.getElementById('cartInstallmentsField').hidden = totais.forma !== 'credito';
}

// Texto da forma de pagamento — usado na mensagem do WhatsApp e
// gravado nas observações do orçamento no banco.
function descreverPagamento(totais) {
  const forma = FORMAS_PAGAMENTO[totais.forma];
  if (totais.desconto) return `${forma.nome} — 5% de desconto à vista (- ${formatBRL(totais.desconto)})`;
  return `${forma.nome} em ${totais.parcelas}x de ${formatBRL(totais.valorParcela)} sem juros`;
}

document.querySelectorAll('input[name="pagamento"]').forEach(input => input.addEventListener('change', renderCart));
document.getElementById('cartInstallments').addEventListener('change', renderCart);

// ---------------------------------------------------------
// RENDERIZAÇÃO DO CARRINHO
// ---------------------------------------------------------
function formatBRL(value) {
  // A API devolve o preço (DECIMAL do MySQL) como texto — sem Number()
  // o toLocaleString não formata e aparece "309.99" em vez de "R$ 309,99".
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderCart() {
  const cart = getCart();
  const cartItemsEl = document.getElementById('cartItems');
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');
  const countEl = document.getElementById('cartCount');

  cartItemsEl.innerHTML = '';

  if (cart.length === 0) {
    const emptyMsg = document.createElement('li');
    emptyMsg.className = 'cart-items__empty';
    emptyMsg.id = 'cartEmptyMsg';
    emptyMsg.textContent = 'Seu carrinho está vazio.';
    cartItemsEl.appendChild(emptyMsg);
    subtotalEl.textContent = formatBRL(0);
    totalEl.textContent = formatBRL(0);
    countEl.textContent = '0';
    document.getElementById('cartPayment').hidden = true;
    document.getElementById('cartDiscountRow').hidden = true;
    atualizarCardsNoCarrinho();
    atualizarBarraCelular(0, 0);
    return;
  }

  let subtotal = 0;
  let totalItems = 0;

  cart.forEach(item => {
    subtotal += item.preco * item.quantity;
    totalItems += item.quantity;

    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <img class="cart-item__img" src="${item.imagem}" alt="${item.nome}">
      <div class="cart-item__info">
        <strong>${item.nome}</strong>
        <small>${formatBRL(Number(item.preco))} cada</small>
        <div class="qty-selector qty-selector--cart">
          <button type="button" class="qty-minus" data-id="${item.id}" aria-label="Diminuir quantidade">-</button>
          <input type="number" class="qty-input" data-id="${item.id}" value="${item.quantity}" min="1">
          <button type="button" class="qty-plus" data-id="${item.id}" aria-label="Aumentar quantidade">+</button>
        </div>
        <small class="cart-item__subtotal">${formatBRL(Number(item.preco) * item.quantity)}</small>
      </div>
      <button class="cart-item__remove" data-id="${item.id}" aria-label="Remover item">×</button>
    `;
    cartItemsEl.appendChild(li);
  });

  const totais = calcularTotais(subtotal);
  subtotalEl.textContent = formatBRL(subtotal);
  totalEl.textContent = formatBRL(totais.total);
  countEl.textContent = String(totalItems);
  renderPagamento(totais);
  atualizarCardsNoCarrinho();
  atualizarBarraCelular(totalItems, totais.total);

  // Liga os eventos de remover e editar quantidade em cada item criado dinamicamente
  cartItemsEl.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
  });
  cartItemsEl.querySelectorAll('.qty-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = getCart().find(item => String(item.id) === String(btn.dataset.id));
      if (current) updateCartQuantity(btn.dataset.id, current.quantity - 1);
    });
  });
  cartItemsEl.querySelectorAll('.qty-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = getCart().find(item => String(item.id) === String(btn.dataset.id));
      if (current) updateCartQuantity(btn.dataset.id, current.quantity + 1);
    });
  });
  cartItemsEl.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', () => {
      updateCartQuantity(input.dataset.id, parseInt(input.value, 10) || 1);
    });
  });
}

// ---------------------------------------------------------
// BUSCA E RENDERIZAÇÃO DOS PRODUTOS (consome a API do backend)
// ---------------------------------------------------------
// Guarda os produtos já carregados para o banner do topo conseguir abrir
// o produto certo quando o cliente clica numa oferta vinculada a ele.
let loadedProducts = [];

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  // innerHTML (em vez de só remover #productsLoading) deixa a função segura
  // pra rodar de novo quando o cliente troca de cidade no meio da visita.
  grid.innerHTML = '<p class="products__loading">Carregando produtos...</p>';

  try {
    const response = await fetch(`${API_BASE_URL}/produtos?cidade=${encodeURIComponent(getCidade())}`);
    if (!response.ok) throw new Error('Falha ao buscar produtos');
    const produtos = await response.json();

    loadedProducts = ordenarVitrine(produtos); // ordem dos mais vendidos: js/vitrine.js
    removerDoCarrinhoIndisponiveis(produtos);
    grid.innerHTML = '';
    loadedProducts.forEach(produto => grid.appendChild(buildProductCard(produto)));
    atualizarCardsNoCarrinho();

  } catch (err) {
    // Fallback: caso a API ainda não esteja rodando, mostra produtos de exemplo
    console.warn('API indisponível, usando dados de exemplo:', err.message);
    loadedProducts = getMockProducts();
    grid.innerHTML = '';
    loadedProducts.forEach(produto => grid.appendChild(buildProductCard(produto)));
    atualizarCardsNoCarrinho();
  }
}

// Produto que a loja ocultou (ex.: acabou no estoque) sai do carrinho
// de quem já tinha adicionado — senão o orçamento seria recusado.
function removerDoCarrinhoIndisponiveis(produtos) {
  const disponiveis = new Set(produtos.map(produto => String(produto.id)));
  const cart = getCart();
  const filtrado = cart.filter(item => disponiveis.has(String(item.id)));
  if (filtrado.length !== cart.length) saveCart(filtrado);
}

function buildProductCard(produto) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.id = produto.id;
  card.dataset.category = getProductCategory(produto.categoria);

  const actionLabel = produto.tipo_acao === 'orcamento' ? 'Solicitar Orçamento' : 'Adicionar ao Carrinho';
  const actionClass = produto.tipo_acao === 'orcamento' ? 'product-card__btn--quote' : 'product-card__btn--cart';

  card.innerHTML = `
    <img class="product-card__img" src="${produto.imagem}" alt="${produto.nome}">
    <span class="product-card__in-cart" aria-label="Quantidade no carrinho" hidden></span>
    <div class="product-card__body">
      <h3 class="product-card__title">${produto.nome}</h3>
      <p class="product-card__desc">${produto.descricao || 'Produto para sua piscina.'}</p>
      <span class="product-card__price">
        ${produto.tipo_acao === 'orcamento' ? 'Sob consulta' : formatBRL(produto.preco)}
      </span>
      <div class="qty-selector">
        <button type="button" class="qty-minus" aria-label="Diminuir">-</button>
        <input type="number" class="qty-input" value="1" min="1" readonly>
        <button type="button" class="qty-plus" aria-label="Aumentar">+</button>
      </div>
      <div class="product-card__actions">
        <button type="button" class="product-card__btn ${actionClass}">${actionLabel}</button>
        <button type="button" class="product-card__details">Ver detalhes</button>
      </div>
    </div>
  `;
  card.querySelector('.product-card__img').addEventListener('error', event => {
    event.currentTarget.src = 'assets/IMG-20260820-WA0128-removebg-preview.png';
  }, { once: true });

  const qtyInput = card.querySelector('.qty-input');
  card.querySelector('.qty-minus').addEventListener('click', () => {
    const current = parseInt(qtyInput.value, 10);
    if (current > 1) qtyInput.value = current - 1;
  });
  card.querySelector('.qty-plus').addEventListener('click', () => {
    qtyInput.value = parseInt(qtyInput.value, 10) + 1;
  });

  // Adiciona a quantidade escolhida no seletor e volta ele pra 1.
  function adicionarDoCard() {
    adicionarComAviso(produto, parseInt(qtyInput.value, 10) || 1);
    qtyInput.value = 1;
  }

  card.querySelector('.product-card__btn').addEventListener('click', adicionarDoCard);
  card.querySelector('.product-card__details').addEventListener('click', () => openProductModal(produto));

  card.addEventListener('click', event => {
    if (event.target.closest('button, input')) return;
    // Carrinho vazio: mostra os detalhes primeiro. Já escolheu algo:
    // tocar no produto adiciona direto (adição rápida).
    if (getCart().length === 0) openProductModal(produto);
    else adicionarDoCard();
  });

  return card;
}

let currentProductImages = [];
let currentProductImageIndex = 0;

let produtoNoModal = null;

function openProductModal(produto) {
  produtoNoModal = produto;
  currentProductImages = (Array.isArray(produto.imagens) && produto.imagens.length ? produto.imagens : [produto.imagem]).filter(Boolean);
  if (!currentProductImages.length) currentProductImages = ['assets/IMG-20260820-WA0128-removebg-preview.png'];
  currentProductImageIndex = 0;
  const modalImage = document.getElementById('productModalImage');
  modalImage.alt = produto.nome;
  modalImage.onerror = () => { modalImage.src = 'assets/IMG-20260820-WA0128-removebg-preview.png'; };
  renderProductImage();
  document.getElementById('productModalCategory').textContent = getProductCategory(produto.categoria);
  document.getElementById('productModalTitle').textContent = produto.nome;
  document.getElementById('productModalDescription').textContent = produto.descricao || 'Entre em contato para saber mais detalhes deste produto.';
  document.getElementById('productModalPrice').textContent = produto.tipo_acao === 'orcamento' ? 'Sob consulta' : formatBRL(produto.preco);
  document.getElementById('productModal').hidden = false;
  document.body.classList.add('modal-is-open');
}

function renderProductImage() {
  const modalImage = document.getElementById('productModalImage');
  modalImage.src = currentProductImages[currentProductImageIndex];
  document.getElementById('productModalPrev').hidden = currentProductImages.length < 2;
  document.getElementById('productModalNext').hidden = currentProductImages.length < 2;
  document.getElementById('productModalDots').innerHTML = currentProductImages.map((image, index) => `<button type="button" class="product-modal__dot${index === currentProductImageIndex ? ' is-active' : ''}" data-image-index="${index}" aria-label="Ver imagem ${index + 1}"></button>`).join('');
  document.querySelectorAll('[data-image-index]').forEach(dot => dot.onclick = () => {
    currentProductImageIndex = Number(dot.dataset.imageIndex);
    renderProductImage();
  });
}

function changeProductImage(direction) {
  if (currentProductImages.length < 2) return;
  currentProductImageIndex = (currentProductImageIndex + direction + currentProductImages.length) % currentProductImages.length;
  renderProductImage();
}

function closeProductModal() {
  document.getElementById('productModal').hidden = true;
  document.body.classList.remove('modal-is-open');
}

// Dados de exemplo — usados apenas se a API não responder (ambiente de dev/preview)
function getMockProducts() {
  return [
    { id: '1', nome: 'Filtro Pro-1', descricao: 'Filtro de areia para piscinas de médio porte.', preco: 850.00, imagem: 'assets/filtro.jpg', tipo_acao: 'carrinho' },
    { id: '2', nome: 'Bomba Eco-Quiet', descricao: 'Bomba silenciosa, alta vazão, baixo consumo.', preco: 620.00, imagem: 'assets/bomba.jpg', tipo_acao: 'carrinho' },
    { id: '3', nome: 'Aquecedor Solar', descricao: 'Sistema de aquecimento solar para piscinas.', preco: 0, imagem: 'assets/aquecedor.jpg', tipo_acao: 'orcamento' },
    { id: '4', nome: 'Capa Térmica', descricao: 'Capa térmica que mantém a temperatura da água.', preco: 450.00, imagem: 'assets/capa.jpg', tipo_acao: 'carrinho' }
  ];
}

// ---------------------------------------------------------
// AÇÃO DO CARRINHO (orçamento)
// ---------------------------------------------------------
// Número de WhatsApp de cada unidade — TODO: confirmar o número real de
// Arraial D'Ajuda (por enquanto usa o número original da loja).
const WHATSAPP_POR_CIDADE = {
  trancoso: '5573999581664',
  eunapolis: '5573988267633',
  arraial_dajuda: '5573999809030'
};

// Formata "5573999581664" -> "(73) 99958-1664" pra exibir no site.
function formatarTelefone(numeroComPais) {
  const numero = numeroComPais.replace(/^55/, '');
  const ddd = numero.slice(0, 2);
  const resto = numero.slice(2);
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
}

// Mostra, na seção "Contato", o telefone da cidade escolhida.
function atualizarTelefoneContato(cidade) {
  const numero = WHATSAPP_POR_CIDADE[cidade];
  if (!numero) return;
  const el = document.getElementById('contactPhone');
  if (el) el.textContent = formatarTelefone(numero);
}

function buildQuoteMessage(cart, totais) {
  const items = cart.map((item, index) => {
    const subtotal = Number(item.preco || 0) * item.quantity;
    return [
      `${index + 1}. ${item.nome}`,
      `Quantidade: ${item.quantity}`,
      `Subtotal: ${formatBRL(subtotal)}`
    ].join('\n');
  }).join('\n\n');
  return [
    `Olá! Gostaria de solicitar um orçamento na Sollazer Piscinas (unidade ${CIDADES[getCidade()] || ''}).`,
    '',
    'Itens selecionados:',
    items,
    '',
    `Soma dos itens: ${formatBRL(totais.subtotal)}`,
    `Forma de pagamento: ${descreverPagamento(totais)}`,
    `Total estimado: ${formatBRL(totais.total)}`,
    '',
    'Aguardo o retorno. Obrigado!'
  ].join('\n');
}

async function handleQuoteRequest() {
  const cart = getCart();
  if (cart.length === 0) return alert('Adicione itens para solicitar um orçamento.');

  const subtotal = cart.reduce((sum, item) => sum + Number(item.preco || 0) * item.quantity, 0);
  const totais = calcularTotais(subtotal);
  if (!totais.forma) {
    // Abre o carrinho (o botão da barra do celular fica fora dele) e
    // destaca a escolha de pagamento em vez de um alert.
    openCart();
    const pagamento = document.getElementById('cartPayment');
    pagamento.classList.add('is-missing');
    pagamento.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const cidade = getCidade();
  const numeroWhatsapp = WHATSAPP_POR_CIDADE[cidade] || WHATSAPP_POR_CIDADE.trancoso;
  const whatsappUrl = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(buildQuoteMessage(cart, totais))}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

  try {
    // Envia o carrinho para a rota pública de orçamentos do backend
    const response = await fetch(`${API_BASE_URL}/orcamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens: cart, cidade, observacoes: `Forma de pagamento: ${descreverPagamento(totais)}. Total estimado: ${formatBRL(totais.total)}.` })
    });
    if (!response.ok) throw new Error('Erro ao enviar orçamento');

    alert('Orçamento solicitado com sucesso! Nossa equipe entrará em contato.');
    clearCart();
  } catch (err) {
    console.error(err);
    alert('Não foi possível enviar o orçamento agora. Tente novamente mais tarde.');
  }
}

document.getElementById('quoteBtn').addEventListener('click', handleQuoteRequest);

// Botão da barra fixa exibida apenas no mobile
// No celular a barra mostra o resumo e abre o carrinho (onde o cliente
// escolhe a forma de pagamento e envia o pedido).
document.getElementById('mobileQuoteBtn').addEventListener('click', () => {
  if (getCart().length === 0) return alert('Toque em um produto para ver os detalhes e adicionar ao carrinho.');
  esconderAvisoCarrinho();
  openCart();
});

function atualizarBarraCelular(totalItems, total) {
  document.getElementById('mobileQuoteBtn').textContent = totalItems
    ? `Finalizar pedido · ${totalItems} ${totalItems === 1 ? 'item' : 'itens'} · ${formatBRL(total)}`
    : '[SOLICITAR ORÇAMENTO]';
}

// ---------------------------------------------------------
// MENU HAMBÚRGUER (mobile)
// ---------------------------------------------------------
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mainNav = document.getElementById('mainNav');
hamburgerBtn.addEventListener('click', () => mainNav.classList.toggle('is-open'));
const productsMenu = document.querySelector('.nav__item--dropdown');
productsMenu.querySelector('.nav__link').addEventListener('click', event => {
  if (window.matchMedia('(max-width: 1023px)').matches) {
    event.preventDefault();
    productsMenu.classList.toggle('is-open');
  }
});

// ---------------------------------------------------------
// ABRIR/FECHAR CARRINHO LATERAL (off-canvas no mobile)
// ---------------------------------------------------------
const cartSidebar = document.getElementById('cartSidebar');
const cartToggle = document.getElementById('cartToggle');
const cartCloseBtn = document.getElementById('cartCloseBtn');
const cartBackdrop = document.getElementById('cartBackdrop');

document.getElementById('productModalAdd').addEventListener('click', () => {
  if (!produtoNoModal) return;
  closeProductModal();
  adicionarComAviso(produtoNoModal, 1);
});

function openCart() {
  esconderAvisoCarrinho();
  renderCart();
  cartSidebar.classList.add('is-open');
  cartBackdrop.classList.add('is-open');
  document.body.classList.add('cart-is-open');
}
function closeCart() {
  cartSidebar.classList.remove('is-open');
  cartBackdrop.classList.remove('is-open');
  document.body.classList.remove('cart-is-open');
}

// Passar o dedo para a direita fecha o carrinho (nem todo mundo
// enxerga o × lá em cima). Só conta se o gesto for mais horizontal
// que vertical, pra não fechar quando o cliente rola a lista.
let toqueInicio = null;
cartSidebar.addEventListener('touchstart', event => {
  toqueInicio = { x: event.touches[0].clientX, y: event.touches[0].clientY };
}, { passive: true });
cartSidebar.addEventListener('touchend', event => {
  if (!toqueInicio) return;
  const dx = event.changedTouches[0].clientX - toqueInicio.x;
  const dy = event.changedTouches[0].clientY - toqueInicio.y;
  toqueInicio = null;
  if (dx > 50 && dx > Math.abs(dy) * 1.5) closeCart();
}, { passive: true });

cartToggle.addEventListener('click', openCart);
cartCloseBtn.addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);
document.getElementById('productModalClose').addEventListener('click', closeProductModal);
document.getElementById('productModalPrev').addEventListener('click', () => changeProductImage(-1));
document.getElementById('productModalNext').addEventListener('click', () => changeProductImage(1));
document.getElementById('productModal').addEventListener('click', event => {
  if (event.target.id === 'productModal') closeProductModal();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  closeCart();
  closeProductModal();
});
closeCart();

function filterProducts(category) {
  document.querySelectorAll('.product-card').forEach(card => {
    card.hidden = category !== 'Todos' && card.dataset.category !== category;
  });
  document.querySelectorAll('[data-category]').forEach(control => {
    if (control.classList.contains('products-filter__button')) control.classList.toggle('is-active', control.dataset.category === category);
  });
}

document.querySelectorAll('[data-category]').forEach(control => {
  control.addEventListener('click', event => {
    event.preventDefault();
    limparBusca();
    filterProducts(control.dataset.category);
    document.getElementById('produtos').scrollIntoView({ behavior: 'smooth' });
    mainNav.classList.remove('is-open');
  });
});

// ---------------------------------------------------------
// BUSCA
// O motor (tolerante a acento, erro de digitação e sinônimos) fica
// em js/busca.js; aqui só mostra/esconde e reordena os cards.
// ---------------------------------------------------------
const productSearch = document.getElementById('productSearch');
const productSearchClear = document.getElementById('productSearchClear');
const productSearchStatus = document.getElementById('productSearchStatus');
let buscaTimer;

function aplicarBusca() {
  const consulta = productSearch.value.trim();
  const grid = document.getElementById('productsGrid');
  const cards = new Map([...grid.querySelectorAll('.product-card')].map(card => [card.dataset.id, card]));
  productSearchClear.hidden = !consulta;

  if (!consulta) {
    // Volta pra ordem da vitrine e pro filtro de categoria que estava ativo.
    loadedProducts.forEach(produto => { const card = cards.get(String(produto.id)); if (card) grid.appendChild(card); });
    productSearchStatus.hidden = true;
    filterProducts(document.querySelector('.products-filter__button.is-active')?.dataset.category || 'Todos');
    return;
  }

  // A busca vale pra loja inteira, não só pra categoria selecionada.
  document.querySelectorAll('.products-filter__button').forEach(button => button.classList.toggle('is-active', button.dataset.category === 'Todos'));
  const { resultados, aproximado } = buscarProdutos(loadedProducts, consulta);
  const encontrados = new Set(resultados.map(produto => String(produto.id)));
  resultados.forEach(produto => { const card = cards.get(String(produto.id)); if (card) grid.appendChild(card); });
  cards.forEach((card, id) => { card.hidden = !encontrados.has(id); });

  productSearchStatus.hidden = false;
  productSearchStatus.classList.toggle('is-empty', !resultados.length);
  if (!resultados.length) productSearchStatus.textContent = `Não encontramos "${consulta}". Chame a gente no WhatsApp que ajudamos a achar.`;
  else if (aproximado) productSearchStatus.textContent = `Não achamos exatamente "${consulta}". Veja produtos parecidos:`;
  else productSearchStatus.textContent = `${resultados.length} ${resultados.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
}

function limparBusca() {
  if (!productSearch.value) return;
  productSearch.value = '';
  aplicarBusca();
}

productSearch.addEventListener('input', () => {
  clearTimeout(buscaTimer);
  buscaTimer = setTimeout(aplicarBusca, 150);
});
productSearchClear.addEventListener('click', () => { limparBusca(); productSearch.focus(); });
// Enter/"buscar" no teclado do celular: fecha o teclado pra mostrar os resultados.
document.getElementById('productSearchForm').addEventListener('submit', event => {
  event.preventDefault();
  clearTimeout(buscaTimer);
  aplicarBusca();
  productSearch.blur();
});

// ---------------------------------------------------------
// INICIALIZAÇÃO
// ---------------------------------------------------------
document.getElementById('year').textContent = new Date().getFullYear();
renderCart();

// ---------------------------------------------------------
// TELA DE SELEÇÃO DE CIDADE
// Aparece sempre, em toda visita/recarregamento. Depois de escolher,
// não existe forma de trocar de cidade sem recarregar a página — de
// propósito, a pedido do dono da loja.
// ---------------------------------------------------------
function initCityGate() {
  const gate = document.getElementById('cityGate');

  // Bloqueia o scroll da página por trás enquanto a tela de cidade
  // está aberta — além do clique já não vazar (elemento fixo cobrindo
  // tudo), evita qualquer rolagem por trás no celular.
  document.body.classList.add('city-gate-is-open');

  async function escolherCidade(cidade) {
    setCidade(cidade);
    atualizarTelefoneContato(cidade);
    gate.hidden = true;
    document.body.classList.remove('city-gate-is-open');
    await loadProducts();
    // Reaplica o filtro de categoria ativo (se houver) nos cards da cidade nova.
    const categoriaAtiva = document.querySelector('.products-filter__button.is-active')?.dataset.category;
    if (categoriaAtiva) filterProducts(categoriaAtiva);
    if (productSearch.value.trim()) aplicarBusca();
    renderCart();
  }

  gate.querySelectorAll('[data-cidade]').forEach(button => {
    button.addEventListener('click', () => escolherCidade(button.dataset.cidade));
  });
}

initCityGate();

// ---------------------------------------------------------
// CARROSSEL DE OFERTAS DO HERO
// ---------------------------------------------------------
const hero = document.getElementById('hero');

function initHeroCarousel() {
  const heroSlides = [...document.querySelectorAll('.hero__slide')];
  const heroDots = [...document.querySelectorAll('.hero__dot')];
  hero.classList.remove('is-loading');
  if (heroSlides.length < 2) {
    document.getElementById('heroPrev').hidden = true;
    document.getElementById('heroNext').hidden = true;
  }
  let activeHeroSlide = 0;
  let heroTimer;

  function showHeroSlide(index) {
    activeHeroSlide = (index + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((slide, slideIndex) => slide.classList.toggle('is-active', slideIndex === activeHeroSlide));
    heroDots.forEach((dot, dotIndex) => dot.classList.toggle('is-active', dotIndex === activeHeroSlide));
  }

  function startHeroTimer() {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => showHeroSlide(activeHeroSlide + 1), 9000);
  }

  document.getElementById('heroPrev').onclick = () => { showHeroSlide(activeHeroSlide - 1); startHeroTimer(); };
  document.getElementById('heroNext').onclick = () => { showHeroSlide(activeHeroSlide + 1); startHeroTimer(); };
  heroDots.forEach(dot => { dot.onclick = () => { showHeroSlide(Number(dot.dataset.slideTo)); startHeroTimer(); }; });
  hero.onmouseenter = () => clearInterval(heroTimer);
  hero.onmouseleave = startHeroTimer;
  startHeroTimer();
}

// Guarda as ofertas carregadas para o clique no banner saber pra onde ir
// (produto vinculado tem prioridade; senão usa o campo "link").
let loadedOffers = [];

async function loadOffers() {
  try {
    const response = await fetch(`${API_BASE_URL}/ofertas`);
    if (!response.ok) throw new Error('Falha ao buscar ofertas');
    const ofertas = await response.json();
    if (ofertas.length === 0) throw new Error('Nenhuma oferta cadastrada');

    loadedOffers = ofertas;
    const heroSlides = document.getElementById('heroSlides');
    heroSlides.innerHTML = ofertas.map((oferta, index) => `
      <article class="hero__slide${index === 0 ? ' is-active' : ''}" data-slide="${index}" role="button" tabindex="0" aria-label="${oferta.titulo || 'Ver oferta'}">
        <img src="${oferta.imagem}" alt="${oferta.titulo || 'Oferta Sollazer Piscinas'}">
      </article>
    `).join('');
    document.getElementById('heroDots').innerHTML = ofertas.map((_, index) => `
      <button class="hero__dot${index === 0 ? ' is-active' : ''}" type="button" data-slide-to="${index}" aria-label="Oferta ${index + 1}"></button>
    `).join('');

    const firstImage = heroSlides.querySelector('img');
    if (firstImage.complete) {
      initHeroCarousel();
    } else {
      firstImage.addEventListener('load', initHeroCarousel, { once: true });
      firstImage.addEventListener('error', initHeroCarousel, { once: true });
    }
    return;
  } catch (err) {
    // Sem oferta cadastrada: mostra um bloco preto no lugar do banner,
    // só pra ficar claro que falta cadastrar uma imagem (em vez de
    // mostrar uma promoção antiga/errada escondida no código).
    console.warn('Nenhuma oferta cadastrada, mostrando banner vazio:', err.message);
    loadedOffers = [];
    document.getElementById('heroSlides').innerHTML = `
      <article class="hero__slide hero__slide--empty is-active" data-slide="0" aria-label="Nenhum banner cadastrado"></article>
    `;
    document.getElementById('heroDots').innerHTML = '';
  }
  initHeroCarousel();
}

// ---------------------------------------------------------
// CLIQUE NO BANNER: leva para o produto vinculado (abre a
// mesma janela de detalhes usada na vitrine) ou, se a oferta
// não tiver produto vinculado, usa o campo "link" (âncora da
// página como "#produtos" ou uma URL externa).
// ---------------------------------------------------------
function handleHeroSlideActivate(slideEl) {
  const oferta = loadedOffers[Number(slideEl.dataset.slide)];
  if (!oferta) return;

  if (oferta.produto_id) {
    const produto = loadedProducts.find(item => String(item.id) === String(oferta.produto_id));
    if (produto) {
      openProductModal(produto);
      document.getElementById('produtos').scrollIntoView({ behavior: 'smooth' });
      return;
    }
  }

  const link = oferta.link || '#produtos';
  if (link.startsWith('#')) {
    document.getElementById(link.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  } else {
    window.location.href = link;
  }
}

document.getElementById('heroSlides').addEventListener('click', event => {
  const slide = event.target.closest('.hero__slide');
  if (slide) handleHeroSlideActivate(slide);
});
document.getElementById('heroSlides').addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const slide = event.target.closest('.hero__slide');
  if (!slide) return;
  event.preventDefault();
  handleHeroSlideActivate(slide);
});

loadOffers();
