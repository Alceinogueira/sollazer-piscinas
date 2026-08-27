/* =========================================================
   middleware/auth.js
   Middleware que protege as rotas do painel administrativo.
   Verifica o token JWT enviado no header Authorization.

   Dois níveis de acesso (campo "papel" no token):
   - 'admin'       -> dono da loja, acesso total (produtos + ofertas)
   - 'funcionario' -> acesso restrito (produtos: criar/editar/preço),
                      sem acesso a ofertas nem exclusão de produtos.
   ========================================================= */

const jwt = require('jsonwebtoken');

// Verifica se o token é válido. Aceita qualquer papel (admin ou funcionario).
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization; // formato esperado: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Valida assinatura e expiração do token.
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload; // disponibiliza os dados do usuário logado nas próximas rotas (id, usuario, nome, papel)
    next();
  } catch (err) {
    // Token inválido, adulterado ou expirado.
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

// Só deixa passar quem tem papel 'admin'. Deve ser usado DEPOIS do authMiddleware
// (precisa que req.admin já exista). Usado nas rotas que um funcionário comum
// não deve acessar (ex: ofertas do carrossel, excluir produto).
function requireAdmin(req, res, next) {
  if (!req.admin || req.admin.papel !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito ao administrador da loja.' });
  }
  next();
}

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requireAdmin = requireAdmin;
