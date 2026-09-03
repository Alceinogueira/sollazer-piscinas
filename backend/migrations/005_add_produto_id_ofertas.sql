-- =========================================================
-- 005_add_produto_id_ofertas.sql
-- Permite vincular uma oferta do carrossel (banner do topo)
-- a um produto específico do catálogo. Quando o cliente clica
-- no banner na loja, ele é levado direto para esse produto.
--
-- Continua opcional: uma oferta sem produto vinculado usa o
-- campo "link" normalmente (ex: "#produtos" ou uma URL externa).
-- =========================================================

ALTER TABLE ofertas
  ADD COLUMN produto_id INT NULL AFTER imagem_url,
  ADD CONSTRAINT fk_ofertas_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE SET NULL;
