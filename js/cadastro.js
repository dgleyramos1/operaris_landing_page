// Read plan info from URL params
const params = new URLSearchParams(window.location.search);
const planId = params.get('planId');
const planName = params.get('planName') || 'Plano Operaris';
const price = parseFloat(params.get('price') || '0');
const interval = params.get('interval') || 'monthly';

function formatPrice(value) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Populate plan summary
function initSummary() {
  const nameEl = document.getElementById('plan-name');
  const priceEl = document.getElementById('plan-price');
  const titleEl = document.getElementById('form-plan-title');
  const backLink = document.getElementById('back-link');

  if (nameEl) nameEl.textContent = planName;
  if (priceEl) priceEl.textContent = `R$ ${formatPrice(price)}/${interval === 'yearly' ? 'ano' : 'mês'}`;
  if (titleEl) titleEl.textContent = planName;
  if (backLink) backLink.href = `index.html#planos`;

  if (!planId) {
    window.location.href = 'index.html#planos';
  }
}

// Masks
function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

function maskDocument(v) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/-$/, '').replace(/\.+$/, '');
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/-$/, '').replace(/\/+$/, '');
}

// Validation
function validateForm(data) {
  const errors = {};
  if (!data.name.trim() || data.name.trim().length < 3) errors.name = 'Nome do estabelecimento obrigatório (mínimo 3 caracteres)';
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'E-mail inválido';
  if (!data.phone || data.phone.replace(/\D/g, '').length < 10) errors.phone = 'Telefone inválido';
  const doc = (data.document || '').replace(/\D/g, '');
  if (doc && doc.length !== 11 && doc.length !== 14) errors.document = 'CPF (11 dígitos) ou CNPJ (14 dígitos)';
  return errors;
}

function setError(id, msg) {
  const el = document.getElementById(`err-${id}`);
  if (el) { el.textContent = msg || ''; el.style.display = msg ? 'block' : 'none'; }
  const input = document.getElementById(id);
  if (input) input.classList.toggle('error', !!msg);
}

function clearErrors() {
  ['name', 'email', 'phone', 'document', 'address'].forEach(id => setError(id, ''));
}

// Form submit
async function handleSubmit(e) {
  e.preventDefault();
  clearErrors();

  const form = e.target;
  const data = {
    planId,
    name: form.name.value,
    email: form.email.value.trim(),
    phone: form.phone.value,
    document: form.document.value,
    address: form.address.value.trim(),
  };

  const errors = validateForm(data);
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([k, v]) => setError(k, v));
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processando…';

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || result.error || 'Erro ao processar solicitação');
    }

    // Redirect to checkout URL if provided, otherwise to success page
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    } else {
      const p = new URLSearchParams({
        email: data.email,
        name: data.name,
        status: result.status || 'created',
        licenseKey: result.licenseKey || '',
      });
      window.location.href = `sucesso.html?${p.toString()}`;
    }
  } catch (err) {
    document.getElementById('form-global-error').textContent = err.message || 'Erro inesperado. Tente novamente.';
    document.getElementById('form-global-error').style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Continuar para pagamento →';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initSummary();

  // Attach masks
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', e => { e.target.value = maskPhone(e.target.value); });
  }
  const docInput = document.getElementById('document');
  if (docInput) {
    docInput.addEventListener('input', e => { e.target.value = maskDocument(e.target.value); });
  }

  // Form submit
  const form = document.getElementById('register-form');
  if (form) form.addEventListener('submit', handleSubmit);
});
