/* =========================================================
   routes/produtos.admin.js
   Rotas PROTEGIDAS — usadas pelo painel administrativo.
   Todas exigem token JWT válido (ver middleware/auth.js),
   aplicado no server.js antes de montar este router.
   CRUD completo: Create, Update, Delete (+ leitura já coberta
   pelas rotas públicas, mas aqui listamos inclusive inativos).
   ========================================================= */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { body, validationResult } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');

// ---------------------------------------------------------
// GET /api/admin/produtos -> lista TODOS os produtos (inclusive inativos)
// ---------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const [produtos] = await db.execute('SELECT * FROM produtos ORDER BY criado_em DESC');
    res.json(produtos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar produtos.' });
  }
});

// ---------------------------------------------------------
// POST /api/admin/produtos -> cria um novo produto
// ---------------------------------------------------------
router.post(
  '/',
  // VALIDAÇÃO/SANITIZAÇÃO DE ENTRADA:
  // express-validator garante tipos e formatos antes de tocar no banco.
  [
    body('nome').trim().notEmpty().withMessage('Nome é obrigatório.').isLength({ max: 150 }),
    body('descricao').optional().trim(),
    body('marca').optional().trim().isLength({ max: 80 }),
    body('categoria').optional().trim().isLength({ max: 80 }),
    body('preco').isFloat({ min: 0 }).withMessage('Preço deve ser um número positivo.'),
    body('estoque').optional().isInt({ min: 0 }),
    body('imagem_url').optional({ values: 'null' }).trim().isLength({ max: 255 }).custom(value => {
      if (!value) return true;
      return value.startsWith('/') || /^https?:\/\//i.test(value);
    }).withMessage('Imagem deve ser um caminho local ou uma URL HTTP/HTTPS.'),
    body('imagens').optional({ values: 'null' }).isArray({ max: 8 }).custom(images => images.every(image => typeof image === 'string' && image.length <= 255 && (image.startsWith('/') || /^https?:\/\//i.test(image)))).withMessage('Galeria de imagens inválida.'),
    body('tipo_acao').isIn(['carrinho', 'orcamento']).withMessage('tipo_acao inválido.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erros: errors.array() });
    }

    const { nome, descricao, marca, categoria, preco, estoque, imagem_url, imagens, tipo_acao } = req.body;

    try {
      // PROTEÇÃO CONTRA SQL INJECTION:
      // Query preparada com placeholders "?" — os valores nunca são
      // concatenados diretamente na string SQL.
      const [result] = await db.execute(
        `INSERT INTO produtos (nome, descricao, marca, categoria, preco, estoque, imagem_url, imagens, tipo_acao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nome, descricao || null, marca || null, categoria || null, preco, estoque || 0, imagem_url || imagens?.[0] || null, imagens?.length ? JSON.stringify(imagens) : null, tipo_acao]
      );

      res.status(201).json({ id: result.insertId, mensagem: 'Produto criado com sucesso.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao criar produto.' });
    }
  }
);

// ---------------------------------------------------------
// PUT /api/admin/produtos/:id -> edita um produto existente
// ---------------------------------------------------------
router.put(
  '/:id',
  [
    body('nome').trim().notEmpty().isLength({ max: 150 }),
    body('descricao').optional().trim(),
    body('marca').optional().trim().isLength({ max: 80 }),
    body('categoria').optional().trim().isLength({ max: 80 }),
    body('preco').isFloat({ min: 0 }),
    body('estoque').optional().isInt({ min: 0 }),
    body('imagem_url').optional({ values: 'null' }).trim().isLength({ max: 255 }).custom(value => {
      if (!value) return true;
      return value.startsWith('/') || /^https?:\/\//i.test(value);
    }).withMessage('Imagem deve ser um caminho local ou uma URL HTTP/HTTPS.'),
    body('imagens').optional({ values: 'null' }).isArray({ max: 8 }).custom(images => images.every(image => typeof image === 'string' && image.length <= 255 && (image.startsWith('/') || /^https?:\/\//i.test(image)))).withMessage('Galeria de imagens inválida.'),
    body('tipo_acao').isIn(['carrinho', 'orcamento']),
    body('ativo').optional().isBoolean()
  ],
  async (req, res) => {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ erro: 'ID inválido.' });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erros: errors.array() });
    }

    const { nome, descricao, marca, categoria, preco, estoque, imagem_url, imagens, tipo_acao, ativo } = req.body;

    try {
      const [result] = await db.execute(
        `UPDATE produtos
         SET nome = ?, descricao = ?, marca = ?, categoria = ?, preco = ?,
             estoque = ?, imagem_url = ?, imagens = ?, tipo_acao = ?, ativo = ?
         WHERE id = ?`,
        [nome, descricao || null, marca || null, categoria || null, preco,
           estoque || 0, imagem_url || imagens?.[0] || null, imagens?.length ? JSON.stringify(imagens) : null, tipo_acao, ativo ?? true, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ erro: 'Produto não encontrado.' });
      }
      res.json({ mensagem: 'Produto atualizado com sucesso.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao atualizar produto.' });
    }
  }
);

// ---------------------------------------------------------
// DELETE /api/admin/produtos/:id -> exclui um produto
// Restrito ao admin — o funcionário pode ocultar um produto
// (campo "ativo") em vez de excluir, via PUT.
// ---------------------------------------------------------
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ erro: 'ID inválido.' });

  try {
    // Query preparada — id nunca é concatenado na string.
    const [result] = await db.execute('DELETE FROM produtos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }
    res.json({ mensagem: 'Produto excluído com sucesso.' });
  } catch (err) {
    console.error(err);
    // Se o produto estiver referenciado em orcamento_itens (FK RESTRICT),
    // o ideal é sugerir "inativar" o produto em vez de excluir.
    res.status(500).json({ erro: 'Erro ao excluir produto. Verifique se ele não está vinculado a orçamentos existentes.' });
  }
});

module.exports = router;
