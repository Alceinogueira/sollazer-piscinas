ALTER TABLE administradores
  ADD COLUMN usuario VARCHAR(80) NULL UNIQUE;

UPDATE administradores
SET usuario = LOWER(SUBSTRING_INDEX(email, '@', 1))
WHERE usuario IS NULL;

ALTER TABLE administradores
  MODIFY usuario VARCHAR(80) NOT NULL;