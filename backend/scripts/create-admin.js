require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/db');

const [nome, usuario, senha] = process.argv.slice(2);

if (!nome || !usuario || !senha) {
  console.error('Uso: node scripts/create-admin.js "Nome" "usuario" "senha"');
  process.exit(1);
}

if (senha.length < 4) {
  console.error('A senha precisa ter pelo menos 4 caracteres.');
  process.exit(1);
}

async function main() {
  const senhaHash = await bcrypt.hash(senha, 12);
  await db.execute(
    `INSERT INTO administradores (nome, usuario, email, senha_hash)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE nome = VALUES(nome), email = VALUES(email), senha_hash = VALUES(senha_hash)`,
    [nome, usuario, `${usuario.toLowerCase()}@sollazerpiscinas.com.br`, senhaHash]
  );
  console.log(`Acesso criado/atualizado para ${nome} (${usuario}).`);
  await db.end();
}

main().catch(error => {
  console.error('Não foi possível criar o acesso:', error.message);
  process.exitCode = 1;
});
