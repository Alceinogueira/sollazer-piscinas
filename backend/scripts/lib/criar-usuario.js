const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const db = require('../../config/db');

// Cria ou atualiza uma conta em "administradores" com o papel informado
// ('admin' = dono da loja, acesso total | 'funcionario' = acesso restrito).
// Usado por scripts/create-admin.js e scripts/create-funcionario.js.
async function criarUsuario({ nome, usuario, senha, papel, comandoUso }) {
  if (!nome || !usuario || !senha) {
    console.error(`Uso: ${comandoUso}`);
    process.exit(1);
  }

  if (senha.length < 4) {
    console.error('A senha precisa ter pelo menos 4 caracteres.');
    process.exit(1);
  }

  const senhaHash = await bcrypt.hash(senha, 12);
  await db.execute(
    `INSERT INTO administradores (nome, usuario, email, senha_hash, papel)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE nome = VALUES(nome), email = VALUES(email),
       senha_hash = VALUES(senha_hash), papel = VALUES(papel)`,
    [nome, usuario, `${usuario.toLowerCase()}@sollazerpiscinas.com.br`, senhaHash, papel]
  );

  const rotulo = papel === 'admin' ? 'administrador (acesso total)' : 'funcionário (acesso restrito)';
  console.log(`Acesso de ${rotulo} criado/atualizado para ${nome} (${usuario}).`);
  await db.end();
}

module.exports = criarUsuario;
