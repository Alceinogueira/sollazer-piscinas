const API_BASE_URL = window.SOLLAZER_API_BASE_URL || 'http://localhost:3000/api';
const token = localStorage.getItem('sollazer_admin_token');
if (!token) window.location.href = 'login.html';
const isAdmin = localStorage.getItem('sollazer_admin_role') === 'admin';
// Vazio = esse login enxerga/gerencia o catálogo de todas as cidades.
const adminCidade = localStorage.getItem('sollazer_admin_cidade') || '';
const CIDADES = { trancoso: 'Trancoso', eunapolis: 'Eunápolis', arraial_dajuda: "Arraial D'Ajuda" };
document.getElementById('adminName').textContent = localStorage.getItem('sollazer_admin_name') || 'funcionário';

// Ofertas do carrossel e exclusão de produto são exclusivas do admin (dono da loja).
// Funcionário só cria/edita produto e altera preço.
if (!isAdmin) document.getElementById('offersSection').style.display = 'none';

// ---------------------------------------------------------
// FILTRO/CIDADE DO CATÁLOGO
// Login restrito a uma cidade: trava o filtro e o campo do
// formulário nela, sem opção de ver/editar outra cidade.
// ---------------------------------------------------------
const cityFilter = document.getElementById('cityFilter');
const productCitySelect = document.getElementById('productCity');
if (adminCidade) {
  cityFilter.innerHTML = `<option value="${adminCidade}">${CIDADES[adminCidade] || adminCidade}</option>`;
  cityFilter.value = adminCidade;
  cityFilter.disabled = true;
  productCitySelect.value = adminCidade;
  productCitySelect.disabled = true;
}
cityFilter.addEventListener('change', () => {
  if (CIDADES[cityFilter.value]) productCitySelect.value = cityFilter.value;
  loadProducts();
});

document.getElementById('logoutButton').onclick = () => {
  localStorage.removeItem('sollazer_admin_token');
  localStorage.removeItem('sollazer_admin_name');
  window.location.href = 'login.html';
};

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    localStorage.removeItem('sollazer_admin_token');
    window.location.href = 'login.html';
  }
  if (!response.ok) throw new Error(data.erro || data.erros?.[0]?.msg || 'Não foi possível concluir a operação.');
  return data;
}

const productFields = ['productName', 'productDescription', 'productBrand', 'productCategory', 'productCity', 'productPrice', 'productStock', 'productImage', 'productActive'];
const offerFields = ['offerTitle', 'offerSubtitle', 'offerDescription', 'offerImage', 'offerProduct', 'offerLink', 'offerOrder', 'offerActive'];
// Mapa explícito DOM-id -> campo da API (os nomes da API são em
// português e não batem com um id em inglês "deduzido" por regex).
const PRODUCT_API_FIELD = { productName: 'nome', productDescription: 'descricao', productBrand: 'marca', productCategory: 'categoria', productCity: 'cidade', productPrice: 'preco', productStock: 'estoque', productImage: 'imagem_url', productActive: 'ativo' };
const OFFER_API_FIELD = { offerTitle: 'titulo', offerSubtitle: 'subtitulo', offerDescription: 'descricao', offerImage: 'imagem_url', offerProduct: 'produto_id', offerLink: 'link', offerOrder: 'ordem', offerActive: 'ativo' };
function value(id) { return document.getElementById(id).value; }
function setValues(fields, data, apiFieldMap) { fields.forEach(id => { const key = apiFieldMap[id]; if (data[key] !== undefined) document.getElementById(id).value = data[key] ?? ''; }); }
function clearForm(formId, fields, titleId, title) { document.getElementById(formId).reset(); document.getElementById(formId.replace('Form', 'Id')).value = ''; document.getElementById(titleId).textContent = title; fields.forEach(id => { if (id.endsWith('Active')) document.getElementById(id).value = 'true'; }); }

async function loadProducts() {
  const cidadeQuery = cityFilter.value ? `?cidade=${encodeURIComponent(cityFilter.value)}` : '';
  const products = await api(`/admin/produtos${cidadeQuery}`);
  updateCategoryOptions(products);
  updateOfferProductOptions(products);
  document.getElementById('productList').innerHTML = products.map(product => `
    <div class="admin-list__item"><img src="${product.imagem_url || '../assets/IMG-20260820-WA0128-removebg-preview.png'}" alt="">
      <div class="admin-list__info"><strong>${product.nome}</strong><small>${CIDADES[product.cidade] || 'sem cidade'} · ${Number(product.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${product.ativo ? 'visível' : 'oculto'}</small></div>
      <button type="button" data-edit-product="${product.id}">Editar</button>${isAdmin ? `<button type="button" data-delete-product="${product.id}">Excluir</button>` : ''}
    </div>`).join('');
  document.querySelectorAll('[data-edit-product]').forEach(button => button.onclick = () => editProduct(products.find(item => String(item.id) === button.dataset.editProduct)));
  document.querySelectorAll('[data-delete-product]').forEach(button => button.onclick = () => deleteProduct(button.dataset.deleteProduct));
}
function updateCategoryOptions(products) {
  const defaults = ['Cloros', 'Bombas e Filtros', 'Produtos Químicos', 'Diversos'];
  const categories = [...new Set([...defaults, ...products.map(product => product.categoria).filter(Boolean)])].sort((first, second) => first.localeCompare(second, 'pt-BR'));
  document.getElementById('productCategories').innerHTML = categories.map(category => `<option value="${category}"></option>`).join('');
}
function updateOfferProductOptions(products) {
  const select = document.getElementById('offerProduct');
  const selected = select.value;
  select.innerHTML = '<option value="">Nenhum — usar o link abaixo</option>' +
    products.map(product => `<option value="${product.id}">${product.nome}</option>`).join('');
  select.value = selected;
}
function editProduct(product) { document.getElementById('productId').value = product.id; setValues(productFields, product, PRODUCT_API_FIELD); document.getElementById('productFormTitle').textContent = 'Editar produto'; window.scrollTo({ top: 0, behavior: 'smooth' }); }
async function deleteProduct(id) { if (!confirm('Excluir este produto?')) return; try { await api(`/admin/produtos/${id}`, { method: 'DELETE' }); await loadProducts(); } catch (error) { alert(error.message); } }

document.getElementById('productForm').onsubmit = async event => {
  event.preventDefault();
  const id = value('productId');
  try {
    let imageUrl = value('productImage');
    let imageGallery = [];
    const imageFiles = [...document.getElementById('productImageFile').files];
    if (imageFiles.length) {
      const formData = new FormData();
      imageFiles.forEach(imageFile => formData.append('imagens', imageFile));
      const uploadResponse = await fetch(`${API_BASE_URL}/admin/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      const uploadData = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) throw new Error(uploadData.erro || 'Não foi possível enviar a imagem.');
      imageGallery = uploadData.imagens;
      imageUrl = imageGallery[0];
    }
    // "productImage" (hidden) só carrega a imagem atual ao editar sem
    // trocar o arquivo. Produto novo sem nenhum upload: bloqueia aqui.
    if (!imageUrl) throw new Error('Selecione pelo menos uma imagem do produto.');
    const payload = { nome: value('productName'), descricao: value('productDescription'), marca: value('productBrand'), categoria: value('productCategory'), cidade: value('productCity'), preco: Number(value('productPrice')), estoque: Number(value('productStock')), imagem_url: imageUrl, imagens: imageGallery.length ? imageGallery : undefined, tipo_acao: 'carrinho', ativo: value('productActive') === 'true' };
    await api(id ? `/admin/produtos/${id}` : '/admin/produtos', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    document.getElementById('productMessage').textContent = 'Produto salvo.';
    resetProductForm();
    document.getElementById('productImageFile').value = '';
    await loadProducts();
  } catch (error) { document.getElementById('productMessage').textContent = error.message; }
};
// Depois de limpar o formulário, a cidade volta pra: a do login (se
// restrito) ou a do filtro selecionado no topo (facilita cadastrar
// vários produtos seguidos da mesma cidade).
function resetProductForm() {
  clearForm('productForm', productFields, 'productFormTitle', 'Adicionar produto');
  if (adminCidade) productCitySelect.value = adminCidade;
  else if (CIDADES[cityFilter.value]) productCitySelect.value = cityFilter.value;
}
document.getElementById('productCancel').onclick = resetProductForm;

async function loadOffers() {
  const offers = await api('/admin/ofertas');
  document.getElementById('offerList').innerHTML = offers.map(offer => `
    <div class="admin-list__item"><img src="${offer.imagem_url}" alt="">
      <div class="admin-list__info"><strong>${offer.titulo}</strong><small>ordem ${offer.ordem} · ${offer.ativo ? 'visível' : 'oculta'}</small></div>
      <button type="button" data-edit-offer="${offer.id}">Editar</button><button type="button" data-delete-offer="${offer.id}">Excluir</button>
    </div>`).join('');
  document.querySelectorAll('[data-edit-offer]').forEach(button => button.onclick = () => editOffer(offers.find(item => String(item.id) === button.dataset.editOffer)));
  document.querySelectorAll('[data-delete-offer]').forEach(button => button.onclick = () => deleteOffer(button.dataset.deleteOffer));
}
function editOffer(offer) { document.getElementById('offerId').value = offer.id; setValues(offerFields, offer, OFFER_API_FIELD); document.getElementById('offerFormTitle').textContent = 'Editar oferta'; window.scrollTo({ top: 0, behavior: 'smooth' }); }
async function deleteOffer(id) { if (!confirm('Excluir esta oferta?')) return; try { await api(`/admin/ofertas/${id}`, { method: 'DELETE' }); await loadOffers(); } catch (error) { alert(error.message); } }

document.getElementById('offerForm').onsubmit = async event => {
  event.preventDefault();
  const id = value('offerId');
  try {
    let imageUrl = value('offerImage');
    const imageFile = document.getElementById('offerImageFile').files[0];
    if (imageFile) {
      // Rota dedicada do banner: padroniza a imagem para 3840x2160 (16:9) no servidor.
      const formData = new FormData();
      formData.append('imagem', imageFile);
      const uploadResponse = await fetch(`${API_BASE_URL}/admin/uploads/oferta`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      const uploadData = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) throw new Error(uploadData.erro || 'Não foi possível enviar a imagem.');
      imageUrl = uploadData.imagem_url;
    }
    if (!imageUrl) throw new Error('Selecione uma imagem da oferta.');
    const produtoId = value('offerProduct');
    const payload = { titulo: value('offerTitle'), subtitulo: value('offerSubtitle'), descricao: value('offerDescription'), imagem_url: imageUrl, produto_id: produtoId ? Number(produtoId) : null, link: value('offerLink'), ordem: Number(value('offerOrder')), ativo: value('offerActive') === 'true' };
    await api(id ? `/admin/ofertas/${id}` : '/admin/ofertas', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    document.getElementById('offerMessage').textContent = 'Oferta salva.';
    clearForm('offerForm', offerFields, 'offerFormTitle', 'Adicionar oferta ao carrossel');
    await loadOffers();
  } catch (error) { document.getElementById('offerMessage').textContent = error.message; }
};
document.getElementById('offerCancel').onclick = () => clearForm('offerForm', offerFields, 'offerFormTitle', 'Adicionar oferta ao carrossel');

Promise.all([loadProducts(), isAdmin ? loadOffers() : Promise.resolve()]).catch(error => { document.getElementById('productMessage').textContent = error.message; });
