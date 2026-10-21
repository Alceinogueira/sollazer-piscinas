-- =========================================================
-- 006_add_cidade.sql
-- Suporte a múltiplas cidades (Trancoso, Eunápolis, Arraial
-- D'Ajuda). Cada cidade passa a ter seu próprio catálogo de
-- produtos — o cliente escolhe a cidade antes de ver a loja.
--
-- Produtos existentes ficam com cidade = NULL (não aparecem em
-- nenhuma cidade até serem reatribuídos manualmente pelo painel
-- admin) — evita jogar o catálogo real/atual numa cidade errada
-- por suposição.
-- =========================================================

ALTER TABLE produtos
  ADD COLUMN cidade ENUM('trancoso', 'eunapolis', 'arraial_dajuda') NULL AFTER categoria,
  ADD INDEX idx_produtos_cidade (cidade);

ALTER TABLE orcamentos
  ADD COLUMN cidade ENUM('trancoso', 'eunapolis', 'arraial_dajuda') NULL AFTER cliente_telefone;

-- NULL = administrador "dono da loja", enxerga e gerencia todas as
-- cidades (como hoje). Um valor aqui restringe esse login a uma
-- única cidade — útil se um dia cada unidade tiver seu próprio
-- funcionário.
ALTER TABLE administradores
  ADD COLUMN cidade ENUM('trancoso', 'eunapolis', 'arraial_dajuda') NULL AFTER papel;
