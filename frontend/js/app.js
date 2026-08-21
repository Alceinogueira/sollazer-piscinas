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
const CART_STORAGE_KEY = 'sollazer_cart';

// ---------------------------------------------------------
// ESTADO DO CARRINHO (persistido em LocalStorage)
// ---------------------------------------------------------
function getCart() {
  const raw = localStorage.getItem(CART_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
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
  openCart();
}

function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
  renderCart();
}

// ---------------------------------------------------------
// RENDERIZAÇÃO DO CARRINHO
// ---------------------------------------------------------
function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderCart() {
  const cart = getCart();
  const cartItemsEl = document.getElementById('cartItems');
  const emptyMsg = document.getElementById('cartEmptyMsg');
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');
  const countEl = document.getElementById('cartCount');

  cartItemsEl.innerHTML = '';

  if (cart.length === 0) {
    cartItemsEl.appendChild(emptyMsg);
    subtotalEl.textContent = formatBRL(0);
    totalEl.textContent = formatBRL(0);
    countEl.textContent = '0';
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
        <strong>${item.quantity}x ${item.nome}</strong><br>
        <span>${formatBRL(item.preco * item.quantity)}</span>
      </div>
      <button class="cart-item__remove" data-id="${item.id}" aria-label="Remover item">×</button>
    `;
    cartItemsEl.appendChild(li);
  });

  // Aqui poderia entrar lógica de frete, descontos, etc.
  const total = subtotal;

  subtotalEl.textContent = formatBRL(subtotal);
  totalEl.textContent = formatBRL(total);
  countEl.textContent = String(totalItems);

  // Liga o evento de remover em cada botão criado dinamicamente
  cartItemsEl.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
  });
}

// ---------------------------------------------------------
// BUSCA E RENDERIZAÇÃO DOS PRODUTOS (consome a API do backend)
// ---------------------------------------------------------
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  const loading = document.getElementById('productsLoading');

  try {
    const response = await fetch(`${API_BASE_URL}/produtos`);
    if (!response.ok) throw new Error('Falha ao buscar produtos');
    const produtos = await response.json();

    loading.remove();
    produtos.forEach(produto => grid.appendChild(buildProductCard(produto)));

  } catch (err) {
    // Fallback: caso a API ainda não esteja rodando, mostra produtos de exemplo
    console.warn('API indisponível, usando dados de exemplo:', err.message);
    loading.remove();
    getMockProducts().forEach(produto => grid.appendChild(buildProductCard(produto)));
  }
}

function buildProductCard(produto) {
  const card = document.createElement('article');
  card.className = 'product-card';

  const actionLabel = produto.tipo_acao === 'orcamento' ? 'Solicitar Orçamento' : 'Adicionar ao Carrinho';
  const actionClass = produto.tipo_acao === 'orcamento' ? 'product-card__btn--quote' : 'product-card__btn--cart';

  card.innerHTML = `
    <img class="product-card__img" src="${produto.imagem}" alt="${produto.nome}">
    <div class="product-card__body">
      <h3 class="product-card__title">${produto.nome}</h3>
      <p class="product-card__desc">${produto.descricao}</p>
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
      </div>
    </div>
  `;

  const qtyInput = card.querySelector('.qty-input');
  card.querySelector('.qty-minus').addEventListener('click', () => {
    const current = parseInt(qtyInput.value, 10);
    if (current > 1) qtyInput.value = current - 1;
  });
  card.querySelector('.qty-plus').addEventListener('click', () => {
    qtyInput.value = parseInt(qtyInput.value, 10) + 1;
  });

  card.querySelector('.product-card__btn').addEventListener('click', () => {
    const quantity = parseInt(qtyInput.value, 10);
    addToCart(produto, quantity);
  });

  return card;
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
// AÇÕES DO CARRINHO (checkout / orçamento)
// Definidas como funções nomeadas para poderem ser reutilizadas
// tanto pelos botões da sidebar quanto pela barra fixa do mobile.
// ---------------------------------------------------------
function handleCheckout() {
  const cart = getCart();
  if (cart.length === 0) return alert('Seu carrinho está vazio.');
  // TODO: integrar com gateway de pagamento (ex: Mercado Pago, Stripe, Pagar.me)
  alert('Redirecionando para o checkout...');
}

async function handleQuoteRequest() {
  const cart = getCart();
  if (cart.length === 0) return alert('Adicione itens para solicitar um orçamento.');

  try {
    // Envia o carrinho para a rota pública de orçamentos do backend
    const response = await fetch(`${API_BASE_URL}/orcamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens: cart })
    });
    if (!response.ok) throw new Error('Erro ao enviar orçamento');

    alert('Orçamento solicitado com sucesso! Nossa equipe entrará em contato.');
    clearCart();
  } catch (err) {
    console.error(err);
    alert('Não foi possível enviar o orçamento agora. Tente novamente mais tarde.');
  }
}

document.getElementById('checkoutBtn').addEventListener('click', handleCheckout);
document.getElementById('quoteBtn').addEventListener('click', handleQuoteRequest);

// Botões da barra fixa exibida apenas no mobile (mesma lógica acima)
document.getElementById('mobileCheckoutBtn').addEventListener('click', handleCheckout);
document.getElementById('mobileQuoteBtn').addEventListener('click', handleQuoteRequest);

// ---------------------------------------------------------
// MENU HAMBÚRGUER (mobile)
// ---------------------------------------------------------
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mainNav = document.getElementById('mainNav');
hamburgerBtn.addEventListener('click', () => mainNav.classList.toggle('is-open'));

// ---------------------------------------------------------
// ABRIR/FECHAR CARRINHO LATERAL (off-canvas no mobile)
// ---------------------------------------------------------
const cartSidebar = document.getElementById('cartSidebar');
const cartToggle = document.getElementById('cartToggle');
const cartCloseBtn = document.getElementById('cartCloseBtn');
const cartBackdrop = document.getElementById('cartBackdrop');

function openCart() {
  cartSidebar.classList.add('is-open');
  cartBackdrop.classList.add('is-open');
}
function closeCart() {
  cartSidebar.classList.remove('is-open');
  cartBackdrop.classList.remove('is-open');
}

cartToggle.addEventListener('click', openCart);
cartCloseBtn.addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);

// ---------------------------------------------------------
// INICIALIZAÇÃO
// ---------------------------------------------------------
document.getElementById('year').textContent = new Date().getFullYear();
loadProducts();
renderCart();

// ---------------------------------------------------------
// CARROSSEL DE OFERTAS DO HERO
// ---------------------------------------------------------
const hero = document.getElementById('hero');

function initHeroCarousel() {
  const heroSlides = [...document.querySelectorAll('.hero__slide')];
  const heroDots = [...document.querySelectorAll('.hero__dot')];
  let activeHeroSlide = 0;
  let heroTimer;

  function showHeroSlide(index) {
    activeHeroSlide = (index + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((slide, slideIndex) => slide.classList.toggle('is-active', slideIndex === activeHeroSlide));
    heroDots.forEach((dot, dotIndex) => dot.classList.toggle('is-active', dotIndex === activeHeroSlide));
  }

  function startHeroTimer() {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => showHeroSlide(activeHeroSlide + 1), 6000);
  }

  document.getElementById('heroPrev').onclick = () => { showHeroSlide(activeHeroSlide - 1); startHeroTimer(); };
  document.getElementById('heroNext').onclick = () => { showHeroSlide(activeHeroSlide + 1); startHeroTimer(); };
  heroDots.forEach(dot => { dot.onclick = () => { showHeroSlide(Number(dot.dataset.slideTo)); startHeroTimer(); }; });
  hero.onmouseenter = () => clearInterval(heroTimer);
  hero.onmouseleave = startHeroTimer;
  startHeroTimer();
}

async function loadOffers() {
  try {
    const response = await fetch(`${API_BASE_URL}/ofertas`);
    if (!response.ok) throw new Error('Falha ao buscar ofertas');
    const ofertas = await response.json();
    if (ofertas.length === 0) return initHeroCarousel();

    document.getElementById('heroSlides').innerHTML = ofertas.map((oferta, index) => `
      <article class="hero__slide${index === 0 ? ' is-active' : ''}" data-slide="${index}"
        style="background-image: url('${oferta.imagem}')">
        <div class="hero__overlay"></div>
        <div class="hero__content">
          <span class="hero__eyebrow">Oferta especial</span>
          <h1>${oferta.titulo}</h1>
          <p>${oferta.subtitulo || oferta.descricao || ''}</p>
          <a href="${oferta.link || '#produtos'}" class="btn btn--primary">Ver Oferta</a>
        </div>
      </article>
    `).join('');
    document.getElementById('heroDots').innerHTML = ofertas.map((_, index) => `
      <button class="hero__dot${index === 0 ? ' is-active' : ''}" type="button" data-slide-to="${index}" aria-label="Oferta ${index + 1}"></button>
    `).join('');
  } catch (err) {
    console.warn('Ofertas da API indisponíveis, usando carrossel padrão:', err.message);
  }
  initHeroCarousel();
}

loadOffers();
