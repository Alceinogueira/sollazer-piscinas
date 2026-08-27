// Se estiver rodando local (backend servindo o frontend em
// http://localhost:3000 ou http://127.0.0.1:3000), usa a própria
// API local automaticamente — não precisa editar nada pra testar.
// Em produção (domínio real), usa a URL do backend publicado.
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isSelfHosted = window.location.hostname === 'sollazer.alcei.online';

window.SOLLAZER_API_BASE_URL = isLocal
  ? `${window.location.protocol}//${window.location.host}/api`
  : isSelfHosted
    ? 'https://sollazer-api.alcei.online/api'
    : 'https://sollazer-piscinas.vercel.app/api';
