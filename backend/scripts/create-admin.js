const criarUsuario = require('./lib/criar-usuario');

const [nome, usuario, senha, cidade] = process.argv.slice(2);

criarUsuario({
  nome,
  usuario,
  senha,
  papel: 'admin',
  cidade,
  comandoUso: 'node scripts/create-admin.js "Nome" "usuario" "senha" [trancoso|eunapolis|arraial_dajuda]'
}).catch(error => {
  console.error('Não foi possível criar o acesso:', error.message);
  process.exitCode = 1;
});
