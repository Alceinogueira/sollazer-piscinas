CREATE TABLE IF NOT EXISTS ofertas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(180) NOT NULL,
  subtitulo     VARCHAR(255),
  descricao     TEXT,
  imagem_url    VARCHAR(500) NOT NULL,
  link          VARCHAR(255) DEFAULT '#produtos',
  ordem         INT NOT NULL DEFAULT 0,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
