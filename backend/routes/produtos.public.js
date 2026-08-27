/* =========================================================
   routes/produtos.public.js
   Rotas PÚBLICAS — usadas pela vitrine (frontend/js/app.js).
   Somente leitura (GET). Nenhuma autenticação é exigida aqui.
   ========================================================= */

const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/produtos  -> lista todos os produtos ativos
router.get('/', async (req, res) => {
  try {
    // Query estática (sem input do usuário) — ainda assim usamos
    // execute() do mysql2, que sempre prepara a query no servidor.
    const [produtos] = await db.execute(
      `SELECT id, nome, descricao, marca, categoria, preco, imagem_url AS imagem, imagens, tipo_acao
       FROM produtos
       WHERE ativo = TRUE
       ORDER BY criado_em DESC`
    );
    res.json(produtos.map(produto => ({ ...produto, imagens: parseImages(produto.imagens, produto.imagem) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar produtos.' });
  }
});

// GET /api/produtos/:id -> detalhe de um produto específico
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  // Validação básica do parâmetro antes de qualquer uso.
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  try {
    // PROTEÇÃO CONTRA SQL INJECTION:
    // Nunca fazer `... WHERE id = ${id}`. Sempre usar placeholder "?"
    // e passar o valor como parâmetro — o driver faz o escaping.
    const [rows] = await db.execute(
      `SELECT id, nome, descricao, marca, categoria, preco, imagem_url AS imagem, imagens, tipo_acao
       FROM produtos WHERE id = ? AND ativo = TRUE`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }
    res.json({ ...rows[0], imagens: parseImages(rows[0].imagens, rows[0].imagem) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar produto.' });
  }
});

module.exports = router;

function parseImages(images, primaryImage) {
  try {
    const parsed = JSON.parse(images || '[]');
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch (error) {
    // Mantém compatibilidade com registros antigos que não tinham galeria.
  }
  return primaryImage ? [primaryImage] : [];
}
