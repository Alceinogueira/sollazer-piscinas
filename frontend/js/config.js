// Descobre sozinho qual API usar — não precisa editar pra testar local.
//
// - Local (backend servindo o front em http://localhost:3000): usa /api da
//   própria origem.
// - Domínio próprio na VPS (sollazerpiscina.com.br, www, ou o antigo
//   sollazer.alcei.online): o Nginx já faz proxy de /api para o backend,
//   então a loja fala com a API na MESMA origem — sem CORS, sem subdomínio
//   de API, sem certificado extra.
// - Qualquer outro host (ex.: preview na Vercel): cai na API publicada.
const selfHostedHosts = [
  'localhost',
  '127.0.0.1',
  'sollazerpiscina.com.br',
  'www.sollazerpiscina.com.br',
  'sollazer.alcei.online',
];

const isSelfHosted = selfHostedHosts.includes(window.location.hostname);

window.SOLLAZER_API_BASE_URL = isSelfHosted
  ? `${window.location.protocol}//${window.location.host}/api`
  : 'https://sollazer-piscinas.vercel.app/api';
