async function loadPlans() {
  const container = document.getElementById('plans-container');
  if (!container) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/plans`);
    if (!res.ok) throw new Error('Falha ao carregar planos');
    const plans = await res.json();

    if (!plans.length) {
      container.innerHTML = '<p class="plans-error">Nenhum plano disponível no momento.</p>';
      return;
    }

    // Pick the middle plan as featured (or the most expensive if only 2)
    const featuredIdx = plans.length > 1 ? Math.floor(plans.length / 2) : 0;

    container.innerHTML = plans.map((plan, i) => renderPlan(plan, i === featuredIdx)).join('');
  } catch (err) {
    container.innerHTML = `<p class="plans-error">Não foi possível carregar os planos. Tente novamente mais tarde.</p>`;
    console.error(err);
  }
}

function renderPlan(plan, featured) {
  const interval = plan.interval === 'yearly' ? 'ano' : 'mês';
  const features = buildFeatureList(plan);

  return `
    <div class="plan-card ${featured ? 'featured' : ''}">
      ${featured ? '<span class="plan-badge">Mais Popular</span>' : ''}
      <div class="plan-name">${plan.name}</div>
      <div class="plan-desc">${plan.description || 'Solução completa para seu estabelecimento.'}</div>
      <div class="plan-price">
        <span class="price-currency">R$</span>
        <span class="price-value">${formatPrice(plan.basePrice)}</span>
        <span class="price-period">/${interval}</span>
      </div>
      <div class="plan-interval">${plan.interval === 'yearly' ? 'Cobrança anual' : 'Cobrança mensal'} · ${plan.maxDevices} dispositivo${plan.maxDevices > 1 ? 's' : ''}</div>
      <ul class="plan-features">
        ${features.map(f => `<li><span class="check">✓</span> ${f}</li>`).join('')}
      </ul>
      <a href="cadastro.html?planId=${plan.id}&planName=${encodeURIComponent(plan.name)}&price=${plan.basePrice}&interval=${plan.interval}"
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
      tables: 'Gestão de mesas',
      orders: 'Pedidos por garçom',
      stock: 'Controle de estoque',
      expenses: 'Gestão de despesas',
      cashier: 'Caixa com sangria e fechamento',
      reports: 'Relatórios detalhados',
      multiUser: 'Multi-usuário',
      products: 'Cadastro de produtos/insumos',
    };
    Object.entries(plan.features).forEach(([k, v]) => {
      if (v && map[k]) features.push(map[k]);
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
