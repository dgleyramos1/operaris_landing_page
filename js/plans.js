function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadPlans() {
  const container = document.getElementById('plans-container');
  if (!container) return;

  container.innerHTML = '<div class="plans-loading"><span class="spinner"></span> Carregando planos...</div>';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${CONFIG.API_BASE_URL}/plans`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    const plans = await res.json();
    renderPlans(container, plans);
  } catch (err) {
    console.error('Erro ao carregar planos:', err.message);
    container.innerHTML = `
      <div class="plans-error">
        <p>Não foi possível carregar os planos no momento.</p>
        <button onclick="loadPlans()" class="btn-retry">Tentar novamente</button>
      </div>`;
  }
}

function renderPlans(container, plans) {
  if (!plans.length) {
    container.innerHTML = '<p class="plans-error">Nenhum plano disponível no momento.</p>';
    return;
  }
  const featuredIdx = plans.length > 1 ? Math.floor(plans.length / 2) : 0;
  container.innerHTML = plans.map((plan, i) => renderPlan(plan, i === featuredIdx)).join('');
}

function renderPlan(plan, featured) {
  const interval = plan.interval === 'yearly' ? 'ano' : 'mês';
  const features = buildFeatureList(plan);

  const maxDev = Number(plan.maxDevices);
  const devLabel = `${maxDev} dispositivo${maxDev > 1 ? 's' : ''}`;
  const billingLabel = plan.interval === 'yearly' ? 'Cobrança anual' : 'Cobrança mensal';

  return `
    <div class="plan-card ${featured ? 'featured' : ''}">
      ${featured ? '<span class="plan-badge">Mais Popular</span>' : ''}
      <div class="plan-name">${esc(plan.name)}</div>
      <div class="plan-desc">${esc(plan.description || 'Solução completa para seu estabelecimento.')}</div>
      <div class="plan-price">
        <span class="price-currency">R$</span>
        <span class="price-value">${esc(formatPrice(plan.basePrice))}</span>
        <span class="price-period">/${esc(interval)}</span>
      </div>
      <div class="plan-interval">${esc(billingLabel)} · ${esc(devLabel)}</div>
      <ul class="plan-features">
        ${features.map(f => `<li><span class="check">✓</span> ${esc(f)}</li>`).join('')}
      </ul>
      <a href="cadastro.html?planId=${encodeURIComponent(plan.id)}&planName=${encodeURIComponent(plan.name)}&price=${encodeURIComponent(plan.basePrice)}&interval=${encodeURIComponent(plan.interval)}"
         class="plan-cta ${featured ? 'primary' : 'secondary'}">
        Contratar agora
      </a>
    </div>
  `;
}

function buildFeatureList(plan) {
  const features = [];

  // From features JSON field
  if (plan.features && typeof plan.features === 'object') {
    const map = {
      tables:     'Gestão de mesas',
      orders:     'Pedidos por garçom',
      stock:      'Controle de estoque',
      expenses:   'Gestão de despesas',
      cashier:    'Caixa com sangria e fechamento',
      reports:    'Relatórios detalhados',
      multiuser:  'Multi-usuário',
      products:   'Cadastro de produtos/insumos',
      management: 'Gestão avançada (estoque, despesas e produção)',
      financial:  'Dashboard financeiro',
      kds:        'KDS — tela de produção',
      printing:   'Impressão térmica de pedidos e recibos',
      audit:      'Auditoria e log de ações',
    };
    Object.entries(plan.features).forEach(([k, v]) => {
      if (v && map[k.toLowerCase()]) features.push(map[k.toLowerCase()]);
    });
  }

  // Fallbacks from plan data
  if (!features.length) {
    features.push('Gestão de mesas e pedidos');
    features.push('Controle de estoque');
    features.push('Caixa com fechamento');
    features.push('Relatórios');
    if (plan.maxDevices > 1) features.push(`Até ${plan.maxDevices} dispositivos`);
  }

  if (plan.graceDays > 0) features.push(`${plan.graceDays} dias de carência`);

  return features;
}

function formatPrice(value) {
  const num = Number(value);
  if (Number.isInteger(num)) return num.toString();
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

document.addEventListener('DOMContentLoaded', loadPlans);
