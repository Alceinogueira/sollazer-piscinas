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

// ---------------------------------------------------------
// LIMITE DE TENTATIVAS
// Depois de 5 senhas erradas para o mesmo usuário a partir do mesmo
// IP, bloqueia por 15 minutos — impede ficar testando senhas sem parar.
// A chave junta IP + usuário pra um funcionário errando a senha no
// Wi-Fi da loja não travar o login dos colegas. Fica em memória:
// reiniciar o backend zera os contadores (aceitável aqui).
// ---------------------------------------------------------
const MAX_TENTATIVAS = 5;
const JANELA_MS = 15 * 60 * 1000;
const tentativas = new Map(); // chave -> { falhas, desde }

function chaveTentativa(req) {
  return `${req.ip}|${String(req.body.usuario || '').trim().toLowerCase()}`;
}

function bloqueado(chave) {
  const registro = tentativas.get(chave);
  if (!registro) return false;
  if (Date.now() - registro.desde > JANELA_MS) {
    tentativas.delete(chave);
    return false;
  }
  return registro.falhas >= MAX_TENTATIVAS;
}

function registrarFalha(chave) {
  const registro = tentativas.get(chave);
  if (!registro || Date.now() - registro.desde > JANELA_MS) tentativas.set(chave, { falhas: 1, desde: Date.now() });
  else registro.falhas += 1;
}

// Limpa registros vencidos de vez em quando pra o Map não crescer sem fim.
setInterval(() => {
  const agora = Date.now();
  for (const [chave, registro] of tentativas) if (agora - registro.desde > JANELA_MS) tentativas.delete(chave);
}, JANELA_MS).unref();

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
    const chave = chaveTentativa(req);
    if (bloqueado(chave)) {
      return res.status(429).json({ erro: 'Muitas tentativas de acesso. Aguarde 15 minutos e tente de novo.' });
    }

    try {
      // Query preparada — protege contra SQL Injection no campo e-mail.
      const [rows] = await db.execute(
        'SELECT id, nome, usuario, email, senha_hash, papel, cidade FROM administradores WHERE usuario = ?',
        [usuario]
      );

      if (rows.length === 0) {
        registrarFalha(chave);
        // Mensagem genérica de propósito: não revela se o e-mail existe ou não.
        return res.status(401).json({ erro: 'Credenciais inválidas.' });
      }

      const admin = rows[0];

      // Compara a senha enviada com o HASH salvo no banco (nunca comparar texto puro).
      const senhaValida = await bcrypt.compare(senha, admin.senha_hash);
      if (!senhaValida) {
        registrarFalha(chave);
        return res.status(401).json({ erro: 'Credenciais inválidas.' });
      }

      tentativas.delete(chave);

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
