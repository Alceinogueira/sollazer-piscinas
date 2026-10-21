/* =========================================================
   routes/produtos.admin.js
   Rotas PROTEGIDAS — usadas pelo painel administrativo.
   Todas exigem token JWT válido (ver middleware/auth.js),
   aplicado no server.js antes de montar este router.
   CRUD completo: Create, Update, Delete (+ leitura já coberta
   pelas rotas públicas, mas aqui listamos inclusive inativos).

   Escopo por cidade: um admin com "cidade" definida no token só
   enxerga/mexe nos produtos daquela cidade — o valor do token
   sempre vence qualquer cidade enviada pelo cliente. Um admin
   sem cidade (dono da loja) continua vendo/gerenciando todas.
   ========================================================= */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { body, validationResult } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const { CIDADES_VALIDAS } = require('../config/cidades');

// Cidade efetiva pra filtrar/gravar: a do token (se o admin for
// restrito a uma cidade) tem sempre prioridade sobre a enviada.
function resolverCidade(req, cidadeEnviada) {
  return req.admin.cidade || cidadeEnviada || null;
}

// ---------------------------------------------------------
// GET /api/admin/produtos?cidade=trancoso -> lista produtos
// (inclusive inativos). Admin sem cidade pode pedir qualquer
// uma via query string, "sem_cidade" (produtos ainda não
// atribuídos a nenhuma cidade), ou omitir pra ver todas de uma vez.
// ---------------------------------------------------------
router.get('/', async (req, res) => {
  const cidadeFiltro = req.admin.cidade || req.query.cidade;

  try {
    let produtos;
    if (cidadeFiltro === 'sem_cidade' && !req.admin.cidade) {
      [produtos] = await db.execute('SELECT * FROM produtos WHERE cidade IS NULL ORDER BY criado_em DESC');
    } else if (CIDADES_VALIDAS.includes(cidadeFiltro)) {
      [produtos] = await db.execute('SELECT * FROM produtos WHERE cidade = ? ORDER BY criado_em DESC', [cidadeFiltro]);
    } else {
      [produtos] = await db.execute('SELECT * FROM produtos ORDER BY criado_em DESC');
    }
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
    body('cidade').isIn(CIDADES_VALIDAS).withMessage('Escolha uma cidade válida.'),
    body('preco').isFloat({ min: 0 }).withMessage('Preço deve ser um número positivo.'),
    body('estoque').optional().isInt({ min: 0 }),
    body('imagem_url').trim().notEmpty().withMessage('A imagem do produto é obrigatória.').isLength({ max: 255 }).custom(value => {
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

    const { nome, descricao, marca, categoria, cidade, preco, estoque, imagem_url, imagens, tipo_acao } = req.body;
    const cidadeFinal = resolverCidade(req, cidade);

    try {
      // PROTEÇÃO CONTRA SQL INJECTION:
      // Query preparada com placeholders "?" — os valores nunca são
      // concatenados diretamente na string SQL.
      const [result] = await db.execute(
        `INSERT INTO produtos (nome, descricao, marca, categoria, cidade, preco, estoque, imagem_url, imagens, tipo_acao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nome, descricao || null, marca || null, categoria || null, cidadeFinal, preco, estoque || 0, imagem_url || imagens?.[0] || null, imagens?.length ? JSON.stringify(imagens) : null, tipo_acao]
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
    body('cidade').isIn(CIDADES_VALIDAS).withMessage('Escolha uma cidade válida.'),
    body('preco').isFloat({ min: 0 }),
    body('estoque').optional().isInt({ min: 0 }),
    body('imagem_url').trim().notEmpty().withMessage('A imagem do produto é obrigatória.').isLength({ max: 255 }).custom(value => {
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

    const { nome, descricao, marca, categoria, cidade, preco, estoque, imagem_url, imagens, tipo_acao, ativo } = req.body;
    const cidadeFinal = resolverCidade(req, cidade);

    try {
      // Admin restrito a uma cidade: a condição "AND cidade = ?" faz o
      // UPDATE não afetar nenhuma linha se o produto for de outra
      // cidade (vira 404 abaixo, sem revelar que o produto existe).
      const params = [nome, descricao || null, marca || null, categoria || null, cidadeFinal,
        preco, estoque || 0, imagem_url || imagens?.[0] || null, imagens?.length ? JSON.stringify(imagens) : null, tipo_acao, ativo ?? true, id];
      let sql = `UPDATE produtos
         SET nome = ?, descricao = ?, marca = ?, categoria = ?, cidade = ?, preco = ?,
             estoque = ?, imagem_url = ?, imagens = ?, tipo_acao = ?, ativo = ?
         WHERE id = ?`;
      if (req.admin.cidade) {
        sql += ' AND cidade = ?';
        params.push(req.admin.cidade);
      }

      const [result] = await db.execute(sql, params);

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
    const params = [id];
    let sql = 'DELETE FROM produtos WHERE id = ?';
    if (req.admin.cidade) {
      sql += ' AND cidade = ?';
      params.push(req.admin.cidade);
    }
    // Query preparada — id nunca é concatenado na string.
    const [result] = await db.execute(sql, params);

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
