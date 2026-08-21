/* =========================================================
   middleware/auth.js
   Middleware que protege as rotas do painel administrativo.
   Verifica o token JWT enviado no header Authorization.
   ========================================================= */

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization; // formato esperado: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Valida assinatura e expiração do token.
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload; // disponibiliza os dados do admin logado nas próximas rotas
    next();
  } catch (err) {
    // Token inválido, adulterado ou expirado.
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

module.exports = authMiddleware;
