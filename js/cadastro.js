const params = new URLSearchParams(window.location.search);
const planId = params.get('planId');
const planName = params.get('planName') || 'Plano Operaris';
const price = parseFloat(params.get('price') || '0');
const interval = params.get('interval') || 'monthly';

let currentStep = 1;
const stepData = {};

function formatPrice(value) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initSummary() {
  const nameEl = document.getElementById('plan-name');
  const priceEl = document.getElementById('plan-price');
  const backLink = document.getElementById('back-link');

  if (nameEl) nameEl.textContent = planName;
  if (priceEl) priceEl.textContent = `R$ ${formatPrice(price)}/${interval === 'yearly' ? 'ano' : 'mês'}`;
  if (backLink) backLink.href = 'index.html#planos';

  if (!planId) window.location.href = 'index.html#planos';
}

// ===== MASKS =====
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

function maskCep(v) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');
}

// ===== VIACEP =====
let cepController = null;

async function fetchCep(cep) {
  const raw = cep.replace(/\D/g, '');
  if (raw.length !== 8) return;

  const status = document.getElementById('cep-status');
  setError('cep', '');
  status.className = 'cep-status cep-loading';
  status.title = '';

  if (cepController) cepController.abort();
  cepController = new AbortController();

  try {
    const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`, { signal: cepController.signal });
    const data = await res.json();

    if (data.erro) {
      setError('cep', 'CEP não encontrado');
      clearAddressFields();
      status.className = 'cep-status cep-error';
      return;
    }

    document.getElementById('street').value = data.logradouro || '';
    document.getElementById('neighborhood').value = data.bairro || '';
    document.getElementById('city').value = data.localidade || '';
    document.getElementById('state').value = data.uf || '';

    status.className = 'cep-status cep-ok';
    status.title = `${data.localidade} — ${data.uf}`;

    // Foca no número se rua foi preenchida, senão foca na rua
    const next = data.logradouro ? 'number' : 'street';
    document.getElementById(next).focus();
  } catch (err) {
    if (err.name === 'AbortError') return;
    setError('cep', 'Erro ao buscar CEP. Tente novamente.');
    status.className = 'cep-status cep-error';
  }
}

function clearAddressFields() {
  ['street', 'neighborhood', 'city', 'state'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

// ===== ERROR HELPERS =====
function setError(id, msg) {
  const el = document.getElementById(`err-${id}`);
  if (el) { el.textContent = msg || ''; el.style.display = msg ? 'block' : 'none'; }
  const input = document.getElementById(id);
  if (input) input.classList.toggle('error', !!msg);
}

function clearErrors(ids) {
  ids.forEach(id => setError(id, ''));
}

// ===== VALIDATION =====
function validateStep1() {
  clearErrors(['bizName', 'phone', 'document', 'cep', 'street', 'number', 'neighborhood']);
  const errors = {};

  const name = document.getElementById('bizName').value.trim();
  if (!name || name.length < 3) errors.bizName = 'Nome do estabelecimento obrigatório (mínimo 3 caracteres)';

  const phone = document.getElementById('phone').value;
  if (!phone || phone.replace(/\D/g, '').length < 10) errors.phone = 'Telefone inválido';

  const doc = (document.getElementById('document').value || '').replace(/\D/g, '');
  if (!doc) errors.document = 'CPF ou CNPJ obrigatório';
  else if (doc.length !== 11 && doc.length !== 14) errors.document = 'CPF (11 dígitos) ou CNPJ (14 dígitos)';

  const cep = (document.getElementById('cep').value || '').replace(/\D/g, '');
  if (!cep) errors.cep = 'CEP obrigatório';
  else if (cep.length !== 8) errors.cep = 'CEP inválido';

  const street = document.getElementById('street').value.trim();
  if (!street) errors.street = 'Rua obrigatória';

  const number = document.getElementById('number').value.trim();
  if (!number) errors.number = 'Número obrigatório';

  const neighborhood = document.getElementById('neighborhood').value.trim();
  if (!neighborhood) errors.neighborhood = 'Bairro obrigatório';

  Object.entries(errors).forEach(([k, v]) => setError(k, v));
  return Object.keys(errors).length === 0;
}

function validateStep2() {
  clearErrors(['userName', 'email', 'password', 'confirmPassword']);
  const errors = {};

  const userName = document.getElementById('userName').value.trim();
  if (!userName || userName.length < 3) errors.userName = 'Nome obrigatório (mínimo 3 caracteres)';

  const email = document.getElementById('email').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'E-mail inválido';

  const password = document.getElementById('password').value;
  if (!password || password.length < 8) errors.password = 'Senha deve ter pelo menos 8 caracteres';

  const confirm = document.getElementById('confirmPassword').value;
  if (password !== confirm) errors.confirmPassword = 'As senhas não coincidem';

  Object.entries(errors).forEach(([k, v]) => setError(k, v));
  return Object.keys(errors).length === 0;
}

// ===== STEP NAVIGATION =====
function goToStep(step) {
  document.getElementById(`step-${currentStep}`).style.display = 'none';
  document.getElementById(`step-${step}`).style.display = 'block';

  for (let i = 1; i <= 3; i++) {
    const node = document.getElementById(`si-${i}`);
    node.classList.remove('active', 'done');
    if (i < step) {
      node.classList.add('done');
      node.querySelector('.step-node').textContent = '✓';
    } else {
      node.querySelector('.step-node').textContent = String(i);
    }
    if (i === step) node.classList.add('active');
  }

  const line12 = document.getElementById('line-12');
  const line23 = document.getElementById('line-23');
  if (line12) line12.classList.toggle('done', step > 1);
  if (line23) line23.classList.toggle('done', step > 2);

  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function collectStep1() {
  stepData.name        = document.getElementById('bizName').value.trim();
  stepData.phone       = document.getElementById('phone').value;
  stepData.document    = document.getElementById('document').value;
  stepData.cep         = document.getElementById('cep').value;
  stepData.street      = document.getElementById('street').value.trim();
  stepData.number      = document.getElementById('number').value.trim();
  stepData.neighborhood = document.getElementById('neighborhood').value.trim();
  stepData.city        = document.getElementById('city').value.trim();
  stepData.state       = document.getElementById('state').value.trim();
}

// ===== SUBMIT =====
async function handleSubmit() {
  if (!validateStep2()) return;

  const btn = document.getElementById('submit-btn');
  const globalErr = document.getElementById('form-global-error');
  globalErr.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processando…';

  const data = {
    planId,
    ...stepData,
    userName: document.getElementById('userName').value.trim(),
    email:    document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${CONFIG.API_BASE_URL}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || result.error || 'Erro ao processar solicitação');
    }

    if (result.checkoutUrl) {
      goToStep(3);
      window.location.href = result.checkoutUrl;
    } else {
      const p = new URLSearchParams({
        email: data.email,
        name: data.name,
        status: result.status || 'created',
      });
      window.location.href = `sucesso.html?${p.toString()}`;
    }
  } catch (err) {
    const msg = err.name === 'AbortError'
      ? 'Tempo esgotado. Verifique sua conexão e tente novamente.'
      : (err.message || 'Erro inesperado. Tente novamente.');
    globalErr.textContent = msg;
    globalErr.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Continuar para pagamento →';
  }
}

// ===== PASSWORD TOGGLE =====
function setupPasswordToggle(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!input || !btn) return;
  btn.addEventListener('click', () => {
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    btn.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
    btn.classList.toggle('active', !visible);
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initSummary();

  document.getElementById('phone').addEventListener('input', e => {
    e.target.value = maskPhone(e.target.value);
  });
  document.getElementById('document').addEventListener('input', e => {
    e.target.value = maskDocument(e.target.value);
  });

  const cepInput = document.getElementById('cep');
  cepInput.addEventListener('input', e => {
    e.target.value = maskCep(e.target.value);
    if (e.target.value.replace(/\D/g, '').length === 8) fetchCep(e.target.value);
  });
  cepInput.addEventListener('blur', e => {
    if (e.target.value.replace(/\D/g, '').length === 8) fetchCep(e.target.value);
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    if (!validateStep1()) return;
    collectStep1();
    goToStep(2);
  });

  document.getElementById('btn-back').addEventListener('click', () => {
    goToStep(1);
  });

  document.getElementById('submit-btn').addEventListener('click', handleSubmit);

  setupPasswordToggle('password', 'toggle-password');
  setupPasswordToggle('confirmPassword', 'toggle-confirm');
});
