/* =========================================================
   routes/auth.js
   Rota PÚBLICA de login para administradores.
   Gera um token JWT usado nas rotas protegidas do painel.
   ========================================================= */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { body, validationResult } = require('express-validator');

// POST /api/auth/login
router.post(
  '/login',
  [
    body('usuario').trim().notEmpty().isLength({ max: 80 }).withMessage('Usuário é obrigatório.'),
    // VALIDAÇÃO DE SENHA: aqui validamos apenas o formato da requisição.
    // A força da senha (mínimo de caracteres, letras/números/símbolos)
    // deve ser garantida no momento do CADASTRO do admin, não no login.
    body('senha').notEmpty().withMessage('Senha é obrigatória.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erros: errors.array() });
    }

    const { usuario, senha } = req.body;

    try {
      // Query preparada — protege contra SQL Injection no campo e-mail.
      const [rows] = await db.execute(
        'SELECT id, nome, usuario, email, senha_hash, papel, cidade FROM administradores WHERE usuario = ?',
        [usuario]
      );

      if (rows.length === 0) {
        // Mensagem genérica de propósito: não revela se o e-mail existe ou não.
        return res.status(401).json({ erro: 'Credenciais inválidas.' });
      }

      const admin = rows[0];

      // Compara a senha enviada com o HASH salvo no banco (nunca comparar texto puro).
      const senhaValida = await bcrypt.compare(senha, admin.senha_hash);
      if (!senhaValida) {
        return res.status(401).json({ erro: 'Credenciais inválidas.' });
      }

      // Gera o token JWT que o painel deve enviar em "Authorization: Bearer <token>".
      // "cidade" vai no token pra o backend sempre confiar nela (nunca no
      // que o cliente envia) — null = admin enxerga/gerencia todas as cidades.
      const token = jwt.sign(
        { id: admin.id, usuario: admin.usuario, nome: admin.nome, papel: admin.papel, cidade: admin.cidade },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.json({ token, admin: { id: admin.id, nome: admin.nome, usuario: admin.usuario, papel: admin.papel, cidade: admin.cidade } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao autenticar.' });
    }
  }
);

module.exports = router;
