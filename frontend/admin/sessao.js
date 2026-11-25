/* =========================================================
   admin/sessao.js
   Sessão do painel, compartilhada entre login.js e dashboard.js.

   Fica no sessionStorage (e não no localStorage): fechar o
   navegador encerra o acesso, pra ninguém pegar o celular/PC
   da loja e cair direto no painel sem digitar a senha.
   ========================================================= */

const SESSAO_CHAVES = ['sollazer_admin_token', 'sollazer_admin_name', 'sollazer_admin_role', 'sollazer_admin_cidade'];

// Versões antigas guardavam o login no localStorage — apaga o que
// tiver sobrado pra ele não continuar valendo depois de fechar o navegador.
SESSAO_CHAVES.forEach(chave => localStorage.removeItem(chave));

function salvarSessao(token, admin) {
  sessionStorage.setItem('sollazer_admin_token', token);
  sessionStorage.setItem('sollazer_admin_name', admin.nome);
  sessionStorage.setItem('sollazer_admin_role', admin.papel || 'funcionario');
  // "cidade" vazia = esse login enxerga/gerencia todas as cidades.
  if (admin.cidade) sessionStorage.setItem('sollazer_admin_cidade', admin.cidade);
  else sessionStorage.removeItem('sollazer_admin_cidade');
}

function lerSessao(chave) {
  return sessionStorage.getItem(chave);
}

function encerrarSessao() {
  SESSAO_CHAVES.forEach(chave => sessionStorage.removeItem(chave));
}

// Lê o "exp" do JWT só pra não mandar pro painel um login já vencido
// (evita o vai-e-volta login -> painel -> login). Quem valida de
// verdade é o backend, em toda chamada.
function tokenNaoVencido(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000 > Date.now();
  } catch (error) {
    return false;
  }
}

// Devolve o token se a sessão ainda vale; senão limpa tudo e devolve null.
function sessaoAtiva() {
  const token = lerSessao('sollazer_admin_token');
  if (token && tokenNaoVencido(token)) return token;
  encerrarSessao();
  return null;
}
