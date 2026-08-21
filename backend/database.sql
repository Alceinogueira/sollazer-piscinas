-- =========================================================
-- SOLLAZER PISCINAS — database.sql
-- Script de criação das tabelas essenciais.
-- Compatível com MySQL 8+ / MariaDB. Para PostgreSQL,
-- troque AUTO_INCREMENT por SERIAL e ENUM conforme necessário.
-- =========================================================

CREATE DATABASE IF NOT EXISTS sollazer_piscinas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sollazer_piscinas;

-- ---------------------------------------------------------
-- Tabela: administradores
-- Usuários que acessam o painel administrativo.
-- IMPORTANTE: a coluna 'senha_hash' deve armazenar SEMPRE
-- um hash (bcrypt/argon2), nunca a senha em texto puro.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS administradores (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(120)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  senha_hash    VARCHAR(255)  NOT NULL, -- gerado com bcrypt (ver middleware/auth.js)
  criado_em     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- Tabela: produtos
-- Como a Sollazer é revendedora, guardamos também o campo
-- 'marca' e 'fornecedor' (ex: Genco, Jacuzzi) para controle
-- interno de estoque/reposição.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS produtos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(150)   NOT NULL,
  descricao     TEXT,
  marca         VARCHAR(80),                  -- ex: Genco, Jacuzzi
  categoria     VARCHAR(80),                  -- ex: Filtros, Bombas, Químicos, Capas
  preco         DECIMAL(10,2)  NOT NULL DEFAULT 0,
  estoque       INT            NOT NULL DEFAULT 0,
  imagem_url    VARCHAR(255),
  -- tipo_acao define se o produto é vendido diretamente (carrinho)
  -- ou se depende de orçamento (ex: instalação de aquecedor solar)
  tipo_acao     ENUM('carrinho', 'orcamento') NOT NULL DEFAULT 'carrinho',
  ativo         BOOLEAN        NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- Tabela: ofertas do carrossel da vitrine
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS ofertas (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  titulo      VARCHAR(180) NOT NULL,
  subtitulo   VARCHAR(255),
  descricao   TEXT,
  imagem_url  VARCHAR(500) NOT NULL,
  link        VARCHAR(255) DEFAULT '#produtos',
  ordem       INT NOT NULL DEFAULT 0,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- Tabela: orcamentos
-- Cabeçalho de uma solicitação de orçamento feita pelo cliente.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS orcamentos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  cliente_nome    VARCHAR(150),
  cliente_email   VARCHAR(150),
  cliente_telefone VARCHAR(30),
  status          ENUM('pendente', 'em_analise', 'respondido', 'cancelado') NOT NULL DEFAULT 'pendente',
  valor_total_estimado DECIMAL(10,2) DEFAULT 0,
  observacoes     TEXT,
  criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- Tabela: orcamento_itens
-- Itens (produtos + quantidade) que compõem cada orçamento.
-- Relaciona orcamentos <-> produtos (N:N).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS orcamento_itens (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  orcamento_id  INT NOT NULL,
  produto_id    INT NOT NULL,
  quantidade    INT NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id)   REFERENCES produtos(id)   ON DELETE RESTRICT
);

-- ---------------------------------------------------------
-- Dados de exemplo (seed) para desenvolvimento
-- ---------------------------------------------------------
INSERT INTO produtos (nome, descricao, marca, categoria, preco, estoque, imagem_url, tipo_acao) VALUES
('Filtro Pro-1',     'Filtro de areia para piscinas de médio porte.', 'Jacuzzi', 'Filtros',  850.00, 15, '/assets/filtro.jpg',    'carrinho'),
('Bomba Eco-Quiet',  'Bomba silenciosa, alta vazão, baixo consumo.',  'Jacuzzi', 'Bombas',   620.00, 20, '/assets/bomba.jpg',     'carrinho'),
('Aquecedor Solar',  'Sistema de aquecimento solar sob medida.',      'Genco',   'Aquecimento', 0.00, 5, '/assets/aquecedor.jpg','orcamento'),
('Capa Térmica',     'Capa térmica que mantém a temperatura da água.','Genco',   'Capas',    450.00, 10, '/assets/capa.jpg',      'carrinho');
