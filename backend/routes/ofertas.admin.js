const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { body, validationResult } = require('express-validator');

const ofertaFields = [
  body('titulo').trim().notEmpty().isLength({ max: 180 }),
  body('subtitulo').optional({ values: 'null' }).trim().isLength({ max: 255 }),
  body('descricao').optional({ values: 'null' }).trim(),
  body('imagem_url').trim().isURL({ require_protocol: true, require_tld: false }),
  body('link').optional({ values: 'null' }).trim().isLength({ max: 255 }),
  body('ordem').optional().isInt({ min: 0 }),
  body('ativo').optional().isBoolean()
];

router.get('/', async (req, res) => {
  try {
    const [ofertas] = await db.execute('SELECT * FROM ofertas ORDER BY ordem ASC, criado_em DESC');
    res.json(ofertas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar ofertas.' });
  }
});

router.post('/', ofertaFields, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ erros: errors.array() });
  const { titulo, subtitulo, descricao, imagem_url, link, ordem, ativo } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO ofertas (titulo, subtitulo, descricao, imagem_url, link, ordem, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [titulo, subtitulo || null, descricao || null, imagem_url, link || '#produtos', ordem || 0, ativo ?? true]
    );
    res.status(201).json({ id: result.insertId, mensagem: 'Oferta criada com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar oferta.' });
  }
});

router.put('/:id', ofertaFields, async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ erro: 'ID inválido.' });
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ erros: errors.array() });
  const { titulo, subtitulo, descricao, imagem_url, link, ordem, ativo } = req.body;

  try {
    const [result] = await db.execute(
      `UPDATE ofertas SET titulo = ?, subtitulo = ?, descricao = ?, imagem_url = ?,
       link = ?, ordem = ?, ativo = ? WHERE id = ?`,
      [titulo, subtitulo || null, descricao || null, imagem_url, link || '#produtos', ordem || 0, ativo ?? true, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ erro: 'Oferta não encontrada.' });
    res.json({ mensagem: 'Oferta atualizada com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar oferta.' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const [result] = await db.execute('DELETE FROM ofertas WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ erro: 'Oferta não encontrada.' });
    res.json({ mensagem: 'Oferta excluída com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir oferta.' });
  }
});

module.exports = router;
