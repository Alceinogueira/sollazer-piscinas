/* =========================================================
   server.js
   Ponto de entrada da API REST — Sollazer Piscinas.

   Estrutura de rotas:
   - /api/produtos          -> públicas   (vitrine)
   - /api/orcamentos        -> públicas   (solicitação de orçamento)
   - /api/auth              -> públicas   (login do admin)
   - /api/admin/produtos    -> PROTEGIDAS (CRUD do painel administrativo)
   ========================================================= */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authMiddleware = require('./middleware/auth');

const produtosPublicRoutes = require('./routes/produtos.public');
const produtosAdminRoutes = require('./routes/produtos.admin');
const orcamentosRoutes = require('./routes/orcamentos');
const authRoutes = require('./routes/auth');
const ofertasPublicRoutes = require('./routes/ofertas.public');
const ofertasAdminRoutes = require('./routes/ofertas.admin');

const app = express();

// ---------------------------------------------------------
// Middlewares globais
// ---------------------------------------------------------
app.use(cors()); // Em produção, restrinja para o domínio real do frontend:
                  // app.use(cors({ origin: 'https://www.sollazerpiscinas.com.br' }));
app.use(express.json()); // parseia JSON no body das requisições

// ---------------------------------------------------------
// Rotas PÚBLICAS
// ---------------------------------------------------------
app.use('/api/produtos', produtosPublicRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ofertas', ofertasPublicRoutes);

// ---------------------------------------------------------
// Rotas PROTEGIDAS (painel administrativo)
// O middleware authMiddleware roda ANTES de qualquer rota
// deste grupo — bloqueia quem não enviar um token JWT válido.
// ---------------------------------------------------------
app.use('/api/admin/produtos', authMiddleware, produtosAdminRoutes);
app.use('/api/admin/ofertas', authMiddleware, ofertasAdminRoutes);

// ---------------------------------------------------------
// Rota de teste / healthcheck
// ---------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', servico: 'Sollazer Piscinas API' });
});

// ---------------------------------------------------------
// Tratamento de rota não encontrada
// ---------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// ---------------------------------------------------------
// Inicialização do servidor
// ---------------------------------------------------------
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor Sollazer Piscinas rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
