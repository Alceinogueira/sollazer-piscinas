/* =========================================================
   config/cidades.js
   Lista única das cidades atendidas pela loja — cada uma tem
   seu próprio catálogo de produtos. Usada pelas rotas de
   produtos, orçamentos e pelo middleware de autenticação para
   validar o campo "cidade".
   ========================================================= */

const CIDADES_VALIDAS = ['trancoso', 'eunapolis', 'arraial_dajuda'];

module.exports = { CIDADES_VALIDAS };
