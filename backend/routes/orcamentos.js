/* =========================================================
   routes/orcamentos.js
   Rota PÚBLICA — recebe as solicitações de orçamento enviadas
   pelo botão "Solicitar Orçamento" do carrinho lateral.
   ========================================================= */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { body, validationResult } = require('express-validator');

// POST /api/orcamentos -> cria uma solicitação de orçamento com seus itens
router.post(
  '/',
  [
    body('cliente_nome').optional().trim().isLength({ max: 150 }),
    body('cliente_email').optional().trim().isEmail().withMessage('E-mail inválido.'),
    body('cliente_telefone').optional().trim().isLength({ max: 30 }),
    body('itens').isArray({ min: 1 }).withMessage('O orçamento precisa ter ao menos um item.'),
    body('itens.*.id').notEmpty().withMessage('Item sem ID de produto.'),
    body('itens.*.quantity').isInt({ min: 1 }).withMessage('Quantidade inválida.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erros: errors.array() });
    }

    const { cliente_nome, cliente_email, cliente_telefone, itens, observacoes } = req.body;

    // Usamos uma transação: se algum item falhar, nada é gravado.
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [orcamentoResult] = await connection.execute(
        `INSERT INTO orcamentos (cliente_nome, cliente_email, cliente_telefone, observacoes)
         VALUES (?, ?, ?, ?)`,
        [cliente_nome || null, cliente_email || null, cliente_telefone || null, observacoes || null]
      );
      const orcamentoId = orcamentoResult.insertId;

      let valorTotal = 0;

      for (const item of itens) {
        // Busca o preço REAL do produto no banco (nunca confiar no preço enviado pelo cliente).
        const [produtoRows] = await connection.execute(
          'SELECT preco FROM produtos WHERE id = ? AND ativo = TRUE',
          [item.id]
        );

        if (produtoRows.length === 0) {
          throw new Error(`Produto ${item.id} não encontrado ou inativo.`);
        }

        const precoUnitario = produtoRows[0].preco;
        valorTotal += precoUnitario * item.quantity;

        await connection.execute(
          `INSERT INTO orcamento_itens (orcamento_id, produto_id, quantidade, preco_unitario)
           VALUES (?, ?, ?, ?)`,
          [orcamentoId, item.id, item.quantity, precoUnitario]
        );
      }

      await connection.execute(
        'UPDATE orcamentos SET valor_total_estimado = ? WHERE id = ?',
        [valorTotal, orcamentoId]
      );

      await connection.commit();
      res.status(201).json({ id: orcamentoId, mensagem: 'Orçamento recebido com sucesso.' });

    } catch (err) {
      await connection.rollback();
      console.error(err);
      res.status(500).json({ erro: 'Erro ao registrar orçamento.' });
    } finally {
      connection.release();
    }
  }
);

module.exports = router;
