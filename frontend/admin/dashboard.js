const API_BASE_URL = window.SOLLAZER_API_BASE_URL || 'http://localhost:3000/api';
const token = localStorage.getItem('sollazer_admin_token');
if (!token) window.location.href = 'login.html';
document.getElementById('adminName').textContent = localStorage.getItem('sollazer_admin_name') || 'funcionário';

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

const productFields = ['productName', 'productDescription', 'productBrand', 'productCategory', 'productPrice', 'productStock', 'productImage', 'productAction', 'productActive'];
const offerFields = ['offerTitle', 'offerSubtitle', 'offerDescription', 'offerImage', 'offerLink', 'offerOrder', 'offerActive'];
function value(id) { return document.getElementById(id).value; }
function setValues(fields, data) { fields.forEach(id => { const key = id.replace(/^product|^offer/, '').replace(/^[A-Z]/, letter => letter.toLowerCase()); if (data[key] !== undefined) document.getElementById(id).value = data[key] ?? ''; }); }
function clearForm(formId, fields, titleId, title) { document.getElementById(formId).reset(); document.getElementById(formId.replace('Form', 'Id')).value = ''; document.getElementById(titleId).textContent = title; fields.forEach(id => { if (id.endsWith('Active')) document.getElementById(id).value = 'true'; }); }

async function loadProducts() {
  const products = await api('/admin/produtos');
  document.getElementById('productList').innerHTML = products.map(product => `
    <div class="admin-list__item"><img src="${product.imagem_url || '../assets/IMG-20260820-WA0128-removebg-preview.png'}" alt="">
      <div class="admin-list__info"><strong>${product.nome}</strong><small>${Number(product.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${product.ativo ? 'visível' : 'oculto'}</small></div>
      <button type="button" data-edit-product="${product.id}">Editar</button><button type="button" data-delete-product="${product.id}">Excluir</button>
    </div>`).join('');
  document.querySelectorAll('[data-edit-product]').forEach(button => button.onclick = () => editProduct(products.find(item => String(item.id) === button.dataset.editProduct)));
  document.querySelectorAll('[data-delete-product]').forEach(button => button.onclick = () => deleteProduct(button.dataset.deleteProduct));
}
function editProduct(product) { document.getElementById('productId').value = product.id; setValues(productFields, product); document.getElementById('productFormTitle').textContent = 'Editar produto'; window.scrollTo({ top: 0, behavior: 'smooth' }); }
async function deleteProduct(id) { if (!confirm('Excluir este produto?')) return; try { await api(`/admin/produtos/${id}`, { method: 'DELETE' }); await loadProducts(); } catch (error) { alert(error.message); } }

document.getElementById('productForm').onsubmit = async event => {
  event.preventDefault();
  const id = value('productId');
  const payload = { nome: value('productName'), descricao: value('productDescription'), marca: value('productBrand'), categoria: value('productCategory'), preco: Number(value('productPrice')), estoque: Number(value('productStock')), imagem_url: value('productImage'), tipo_acao: value('productAction'), ativo: value('productActive') === 'true' };
  try { await api(id ? `/admin/produtos/${id}` : '/admin/produtos', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); document.getElementById('productMessage').textContent = 'Produto salvo.'; clearForm('productForm', productFields, 'productFormTitle', 'Adicionar produto'); await loadProducts(); } catch (error) { document.getElementById('productMessage').textContent = error.message; }
};
document.getElementById('productCancel').onclick = () => clearForm('productForm', productFields, 'productFormTitle', 'Adicionar produto');

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
function editOffer(offer) { document.getElementById('offerId').value = offer.id; setValues(offerFields, offer); document.getElementById('offerFormTitle').textContent = 'Editar oferta'; window.scrollTo({ top: 0, behavior: 'smooth' }); }
async function deleteOffer(id) { if (!confirm('Excluir esta oferta?')) return; try { await api(`/admin/ofertas/${id}`, { method: 'DELETE' }); await loadOffers(); } catch (error) { alert(error.message); } }

document.getElementById('offerForm').onsubmit = async event => {
  event.preventDefault();
  const id = value('offerId');
  const payload = { titulo: value('offerTitle'), subtitulo: value('offerSubtitle'), descricao: value('offerDescription'), imagem_url: value('offerImage'), link: value('offerLink'), ordem: Number(value('offerOrder')), ativo: value('offerActive') === 'true' };
  try { await api(id ? `/admin/ofertas/${id}` : '/admin/ofertas', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); document.getElementById('offerMessage').textContent = 'Oferta salva.'; clearForm('offerForm', offerFields, 'offerFormTitle', 'Adicionar oferta ao carrossel'); await loadOffers(); } catch (error) { document.getElementById('offerMessage').textContent = error.message; }
};
document.getElementById('offerCancel').onclick = () => clearForm('offerForm', offerFields, 'offerFormTitle', 'Adicionar oferta ao carrossel');

Promise.all([loadProducts(), loadOffers()]).catch(error => { document.getElementById('productMessage').textContent = error.message; });
