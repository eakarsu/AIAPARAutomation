// Centralized API service for AI AP/AR Automation
// Provides JWT-aware fetch wrappers and AI feature endpoints.

const API_BASE = '/api';

function getHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function handle(res) {
  if (!res.ok) {
    let body;
    try { body = await res.json(); } catch (_) { body = { error: res.statusText }; }
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function request(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: getHeaders(options.headers || {}),
  }).then(handle);
}

// Build a query string from an object (omits undefined/null values)
function qs(params = {}) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

// ─── AI endpoints ─────────────────────────────────────────────────────────────
export const ai = {
  invoiceMatching: (invoiceId) =>
    request('/ai/invoice-matching', { method: 'POST', body: JSON.stringify({ invoiceId }) }),
  paymentReconciliation: (paymentId) =>
    request('/ai/payment-reconciliation', { method: 'POST', body: JSON.stringify({ paymentId }) }),
  dunning: (recordId) =>
    request('/ai/dunning-optimization', { method: 'POST', body: JSON.stringify({ recordId }) }),
  cashApplication: (receiptId) =>
    request('/ai/cash-application', { method: 'POST', body: JSON.stringify({ receiptId }) }),
  discountCapture: (discountId) =>
    request('/ai/discount-capture', { method: 'POST', body: JSON.stringify({ discountId }) }),
  agingAnalysis: () => request('/ai/aging-analysis', { method: 'POST', body: '{}' }),

  vendorHealth: (vendorId) =>
    request('/ai/vendor-health', { method: 'POST', body: JSON.stringify({ vendorId }) }),
  creditAdvisor: (customerId) =>
    request('/ai/credit-advisor', { method: 'POST', body: JSON.stringify({ customerId }) }),
  dunningLetter: (payload) =>
    request('/ai/dunning-strategy', { method: 'POST', body: JSON.stringify(payload) }),
  invoiceAnomaly: (invoice_ids) =>
    request('/ai/detect-anomalies', { method: 'POST', body: JSON.stringify({ invoice_ids: invoice_ids || [] }) }),
  cashForecast: (horizonDays = 90) =>
    request('/ai/cash-flow-forecast', { method: 'POST', body: JSON.stringify({ horizonDays }) }),
  intercompanyOptimizer: () =>
    request('/ai/intercompany-optimizer', { method: 'POST', body: '{}' }),
  taxCompliance: (jurisdiction) =>
    request('/ai/tax-compliance', { method: 'POST', body: JSON.stringify({ jurisdiction }) }),
  discountDashboard: () =>
    request('/ai/discount-dashboard', { method: 'POST', body: '{}' }),

  // AI history
  history: (params = {}) => request(`/ai/history${qs(params)}`),
  historyItem: (id) => request(`/ai/history/${id}`),
};

// ─── Resource APIs ─────────────────────────────────────────────────────────────
// Each list() returns { data: [...], pagination: { page, limit, total, totalPages } }
// Legacy callers that do .then(items => items.filter(...)) will break — use listAll() for that.

export const invoices = {
  list: (params = {}) => request(`/invoices${qs(params)}`),
  // Fetch all pages for use in dropdowns / AI selectors
  listAll: async () => {
    const first = await request('/invoices?limit=200');
    if (first.pagination && first.pagination.totalPages <= 1) return first.data;
    const rest = await Promise.all(
      Array.from({ length: first.pagination.totalPages - 1 }, (_, i) =>
        request(`/invoices?limit=200&page=${i + 2}`)
      )
    );
    return [first.data, ...rest.map(r => r.data)].flat();
  },
  get: (id) => request(`/invoices/${id}`),
  create: (d) => request('/invoices', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
};

export const payments = {
  list: (params = {}) => request(`/payments${qs(params)}`),
  listAll: async () => {
    const first = await request('/payments?limit=200');
    if (first.pagination && first.pagination.totalPages <= 1) return first.data;
    const rest = await Promise.all(
      Array.from({ length: first.pagination.totalPages - 1 }, (_, i) =>
        request(`/payments?limit=200&page=${i + 2}`)
      )
    );
    return [first.data, ...rest.map(r => r.data)].flat();
  },
  get: (id) => request(`/payments/${id}`),
  create: (d) => request('/payments', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`/payments/${id}`, { method: 'DELETE' }),
};

export const dunning = {
  list: (params = {}) => request(`/dunning${qs(params)}`),
  listAll: async () => {
    const first = await request('/dunning?limit=200');
    if (first.pagination && first.pagination.totalPages <= 1) return first.data;
    const rest = await Promise.all(
      Array.from({ length: first.pagination.totalPages - 1 }, (_, i) =>
        request(`/dunning?limit=200&page=${i + 2}`)
      )
    );
    return [first.data, ...rest.map(r => r.data)].flat();
  },
  get: (id) => request(`/dunning/${id}`),
  create: (d) => request('/dunning', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`/dunning/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`/dunning/${id}`, { method: 'DELETE' }),
};

export const contacts = {
  list: (params = {}) => request(`/contacts${qs(params)}`),
  listAll: async () => {
    const first = await request('/contacts?limit=200');
    if (first.pagination && first.pagination.totalPages <= 1) return first.data;
    const rest = await Promise.all(
      Array.from({ length: first.pagination.totalPages - 1 }, (_, i) =>
        request(`/contacts?limit=200&page=${i + 2}`)
      )
    );
    return [first.data, ...rest.map(r => r.data)].flat();
  },
  vendors: async () => {
    const all = await contacts.listAll();
    return all.filter((c) => c.type === 'vendor' || c.contact_type === 'vendor');
  },
  customers: async () => {
    const all = await contacts.listAll();
    return all.filter((c) => c.type === 'customer' || c.contact_type === 'customer');
  },
  get: (id) => request(`/contacts/${id}`),
  create: (d) => request('/contacts', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`/contacts/${id}`, { method: 'DELETE' }),
};

export const aging = {
  list: (params = {}) => request(`/aging${qs(params)}`),
  listAll: async () => {
    const first = await request('/aging?limit=200');
    if (first.pagination && first.pagination.totalPages <= 1) return first.data;
    const rest = await Promise.all(
      Array.from({ length: first.pagination.totalPages - 1 }, (_, i) =>
        request(`/aging?limit=200&page=${i + 2}`)
      )
    );
    return [first.data, ...rest.map(r => r.data)].flat();
  },
  get: (id) => request(`/aging/${id}`),
  create: (d) => request('/aging', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`/aging/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`/aging/${id}`, { method: 'DELETE' }),
};

export const cashApplications = {
  list: (params = {}) => request(`/cash-applications${qs(params)}`),
  get: (id) => request(`/cash-applications/${id}`),
  create: (d) => request('/cash-applications', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`/cash-applications/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`/cash-applications/${id}`, { method: 'DELETE' }),
};

export const discountsApi = {
  list: (params = {}) => request(`/discounts${qs(params)}`),
  get: (id) => request(`/discounts/${id}`),
  create: (d) => request('/discounts', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => request(`/discounts/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  remove: (id) => request(`/discounts/${id}`, { method: 'DELETE' }),
};

export const reports = {
  summary: () => request('/reports/summary'),
  trends: () => request('/reports/trends'),
  topEntities: () => request('/reports/top-entities'),
};

export default { ai, invoices, payments, dunning, contacts, aging, cashApplications, discountsApi, reports };
