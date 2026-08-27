const criarUsuario = require('./lib/criar-usuario');

const [nome, usuario, senha] = process.argv.slice(2);

criarUsuario({
  nome,
  usuario,
  senha,
  papel: 'admin',
  comandoUso: 'node scripts/create-admin.js "Nome" "usuario" "senha"'
}).catch(error => {
  console.error('Não foi possível criar o acesso:', error.message);
  process.exitCode = 1;
});
