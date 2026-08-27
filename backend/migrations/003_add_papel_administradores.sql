-- =========================================================
-- 003_add_papel_administradores.sql
-- Adiciona o controle de papel (admin x funcionario) na
-- tabela administradores, para quem já tinha o banco criado
-- antes desse recurso existir.
--
-- 'admin'       -> acesso total (produtos + ofertas + excluir)
-- 'funcionario' -> acesso restrito (produtos: criar/editar/
--                  alterar preço; sem excluir e sem ofertas)
-- =========================================================

ALTER TABLE administradores
  ADD COLUMN papel ENUM('admin', 'funcionario') NOT NULL DEFAULT 'funcionario' AFTER usuario;

-- Quem já tinha conta antes desse recurso é o dono da loja
-- (o próprio admin) — então promove todo mundo que já existia
-- para 'admin'. Os novos funcionários criados depois disso
-- entram como 'funcionario' (veja scripts/create-funcionario.js).
UPDATE administradores SET papel = 'admin';
