const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [ofertas] = await db.execute(
      `SELECT id, titulo, subtitulo, descricao, imagem_url AS imagem, produto_id, link
       FROM ofertas WHERE ativo = TRUE ORDER BY ordem ASC, criado_em DESC`
    );
    res.json(ofertas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar ofertas.' });
  }
});

module.exports = router;
