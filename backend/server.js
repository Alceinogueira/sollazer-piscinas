/* =========================================================
   server.js
   Ponto de entrada da API REST — Sollazer Piscinas.

   Estrutura de rotas:
   - /api/produtos          -> públicas   (vitrine)
   - /api/orcamentos        -> públicas   (solicitação de orçamento)
   - /api/auth              -> públicas   (login do admin)
   - /api/admin/produtos    -> PROTEGIDAS (CRUD do painel administrativo)
   ========================================================= */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const authMiddleware = require('./middleware/auth');
const { requireAdmin } = authMiddleware;

const produtosPublicRoutes = require('./routes/produtos.public');
const produtosAdminRoutes = require('./routes/produtos.admin');
const orcamentosRoutes = require('./routes/orcamentos');
const authRoutes = require('./routes/auth');
const ofertasPublicRoutes = require('./routes/ofertas.public');
const ofertasAdminRoutes = require('./routes/ofertas.admin');
const uploadsAdminRoutes = require('./routes/uploads.admin');

const app = express();

// ---------------------------------------------------------
// Middlewares globais
// ---------------------------------------------------------
app.use(cors()); // Em produção, restrinja para o domínio real do frontend:
                  // app.use(cors({ origin: 'https://www.sollazerpiscinas.com.br' }));
app.use(express.json()); // parseia JSON no body das requisições

// ---------------------------------------------------------
// Serve o FRONTEND estático (loja + painel + imagens).
// Assim dá pra testar o site inteiro localmente rodando só
// este servidor: http://localhost:3000/ (loja) e
// http://localhost:3000/admin/login.html (painel).
// Em produção você pode manter assim ou publicar o frontend
// separadamente (ex: outro projeto na Vercel) — nesse caso
// ajuste window.SOLLAZER_API_BASE_URL em frontend/js/config.js.
// ---------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'frontend')));

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
app.use('/api/admin/uploads', authMiddleware, uploadsAdminRoutes);
// Ofertas do carrossel: só o admin (dono da loja) mexe nisso.
app.use('/api/admin/ofertas', authMiddleware, requireAdmin, ofertasAdminRoutes);

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
