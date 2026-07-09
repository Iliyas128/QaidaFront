const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return;
  } catch {
    /* Safari private mode can block persistent storage. */
  }

  try {
    sessionStorage.setItem(key, value);
  } catch {
    // No storage available; the login request can still finish, but it cannot persist.
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}

export function getAccessToken() {
  return readStorage(ACCESS_KEY) || readStorage('token');
}

export function getRefreshToken() {
  return readStorage(REFRESH_KEY);
}

export function setTokens(accessToken, refreshToken) {
  writeStorage(ACCESS_KEY, accessToken);
  if (refreshToken) writeStorage(REFRESH_KEY, refreshToken);
  removeStorage('token');
}

export function clearTokens() {
  removeStorage(ACCESS_KEY);
  removeStorage(REFRESH_KEY);
  removeStorage('token');
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Refresh failed');

  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

async function request(path, options = {}, retry = true) {
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && retry && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    try {
      await refreshAccessToken();
      return request(path, options, false);
    } catch {
      clearTokens();
      throw new Error(data.message || 'Session expired');
    }
  }

  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export const api = {
  auth: {
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    refresh: () => refreshAccessToken(),
    me: () => request('/auth/me'),
  },
  establishments: {
    list: () => request('/establishments'),
    get: (id) => request(`/establishments/${id}`),
    create: (body) => request('/establishments', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/establishments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    uploadLogo: (id, file) => {
      const form = new FormData();
      form.append('logo', file);
      return request(`/establishments/${id}/logo`, { method: 'POST', body: form });
    },
  },
  tables: {
    list: (estId) => request(`/establishments/${estId}/tables`),
    status: (estId) => request(`/establishments/${estId}/tables/status`),
    detail: (estId, tableId) => request(`/establishments/${estId}/tables/${tableId}/detail`),
    create: (estId, body) =>
      request(`/establishments/${estId}/tables`, { method: 'POST', body: JSON.stringify(body) }),
    getQr: (estId, tableId) => request(`/establishments/${estId}/tables/${tableId}/qr`),
    clear: (estId, tableId) =>
      request(`/establishments/${estId}/tables/${tableId}/clear`, { method: 'PATCH' }),
    update: (estId, tableId, body) =>
      request(`/establishments/${estId}/tables/${tableId}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (estId, tableId) =>
      request(`/establishments/${estId}/tables/${tableId}`, { method: 'DELETE' }),
  },
  menu: {
    categories: (estId) => request(`/establishments/${estId}/menu/categories`),
    createCategory: (estId, body) =>
      request(`/establishments/${estId}/menu/categories`, { method: 'POST', body: JSON.stringify(body) }),
    updateCategory: (estId, id, body) =>
      request(`/establishments/${estId}/menu/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteCategory: (estId, id) =>
      request(`/establishments/${estId}/menu/categories/${id}`, { method: 'DELETE' }),
    items: (estId) => request(`/establishments/${estId}/menu/items`),
    createItem: (estId, body) =>
      request(`/establishments/${estId}/menu/items`, { method: 'POST', body: JSON.stringify(body) }),
    updateItem: (estId, id, body) =>
      request(`/establishments/${estId}/menu/items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    setAvailability: (estId, id, isAvailable) =>
      request(`/establishments/${estId}/menu/items/${id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
      }),
    uploadImage: (estId, id, file) => {
      const form = new FormData();
      form.append('image', file);
      return request(`/establishments/${estId}/menu/items/${id}/image`, { method: 'POST', body: form });
    },
    deleteItem: (estId, id) =>
      request(`/establishments/${estId}/menu/items/${id}`, { method: 'DELETE' }),
  },
  orders: {
    list: (estId, opts = {}) => {
      const q = new URLSearchParams();
      if (opts.status) q.set('status', opts.status);
      if (opts.scope) q.set('scope', opts.scope);
      const qs = q.toString();
      return request(`/establishments/${estId}/orders${qs ? `?${qs}` : ''}`);
    },
    history: (estId, params) => {
      const q = new URLSearchParams(params).toString();
      return request(`/establishments/${estId}/orders/history?${q}`);
    },
    updateStatus: (estId, orderId, status) =>
      request(`/establishments/${estId}/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    create: (estId, body) =>
      request(`/establishments/${estId}/orders`, { method: 'POST', body: JSON.stringify(body) }),
  },
  staff: {
    list: (estId) => request(`/establishments/${estId}/staff`),
    get: (estId, staffId) => request(`/establishments/${estId}/staff/${staffId}`),
    update: (estId, staffId, body) =>
      request(`/establishments/${estId}/staff/${staffId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    stats: (estId, staffId, params) => {
      const q = new URLSearchParams(params).toString();
      return request(`/establishments/${estId}/staff/${staffId}/stats?${q}`);
    },
    create: (estId, body) =>
      request(`/establishments/${estId}/staff`, { method: 'POST', body: JSON.stringify(body) }),
    delete: (estId, id) => request(`/establishments/${estId}/staff/${id}`, { method: 'DELETE' }),
  },
  stats: (estId, params) => {
    const q = new URLSearchParams(params).toString();
    return request(`/establishments/${estId}/stats?${q}`);
  },
  finance: {
    list: (estId, params) => {
      const q = new URLSearchParams(params).toString();
      return request(`/establishments/${estId}/finance?${q}`);
    },
    create: (estId, body) =>
      request(`/establishments/${estId}/finance`, { method: 'POST', body: JSON.stringify(body) }),
    delete: (estId, id) =>
      request(`/establishments/${estId}/finance/${id}`, { method: 'DELETE' }),
  },
  waiterCalls: {
    list: (estId) => request(`/establishments/${estId}/waiter-calls`),
    acknowledge: (estId, callId) =>
      request(`/establishments/${estId}/waiter-calls/${callId}/acknowledge`, { method: 'PATCH' }),
  },
  client: {
    getMenu: (token) => request(`/menu/${token}`),
    placeOrder: (token, body) =>
      request(`/menu/${token}/order`, { method: 'POST', body: JSON.stringify(body) }),
    callWaiter: (token) => request(`/menu/${token}/call-waiter`, { method: 'POST' }),
    getOrders: (token) => request(`/menu/${token}/orders`),
    heartbeat: (token) => request(`/menu/${token}/heartbeat`, { method: 'POST' }),
  },
  push: {
    getVapidKey: () => request('/push/vapid-key'),
    subscribe: (body) =>
      request('/push/subscribe', { method: 'POST', body: JSON.stringify(body) }),
    unsubscribe: (body) =>
      request('/push/subscribe', { method: 'DELETE', body: JSON.stringify(body) }),
  },
};

export function localized(obj, lang) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.ru || obj.kk || '';
}
