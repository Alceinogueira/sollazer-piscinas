const API_BASE_URL = window.SOLLAZER_API_BASE_URL || 'http://localhost:3000/api';

if (localStorage.getItem('sollazer_admin_token')) {
  window.location.href = 'dashboard.html';
}

document.getElementById('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.getElementById('loginMessage');
  message.textContent = 'Entrando...';

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: document.getElementById('usuario').value,
        senha: document.getElementById('senha').value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || 'Não foi possível entrar.');
    localStorage.setItem('sollazer_admin_token', data.token);
    localStorage.setItem('sollazer_admin_name', data.admin.nome);
    window.location.href = 'dashboard.html';
  } catch (error) {
    message.textContent = error.message;
  }
});
