/**
 * UrbanNest AI — Backend API Service
 * All calls to the FastAPI backend go through here.
 */

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

async function apiFetch(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ── Country & config ──────────────────────────────────────────────
export async function getCountries() {
  return apiFetch('/api/countries');
}

export async function getHealth() {
  return apiFetch('/api/health');
}

// ── Property search ───────────────────────────────────────────────
export async function searchNL({ q, country = 'uk', city = null, rag = false }) {
  const params = new URLSearchParams({ q, country });
  if (city) params.set('city', city);
  if (rag)  params.set('rag', 'true');
  return apiFetch(`/api/search/nl?${params}`);
}

export async function searchFilter(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '')
  ).toString();
  return apiFetch(`/api/search/filter?${qs}`);
}

export async function getFeatured({ country = 'uk', limit = 8 } = {}) {
  return apiFetch(`/api/properties/featured?country=${country}&limit=${limit}`);
}

export async function getProperty(id) {
  return apiFetch(`/api/properties/${id}`);
}

export async function getSimilar(id) {
  return apiFetch(`/api/properties/${id}/similar`);
}

// ── Favorites ─────────────────────────────────────────────────────
export async function saveFavorite(propertyId, userId, notes = '') {
  const params = new URLSearchParams({ user_id: userId });
  if (notes) params.set('notes', notes);
  return apiFetch(`/api/favorites/${propertyId}?${params}`, { method: 'POST' });
}

export async function removeFavorite(propertyId, userId) {
  return apiFetch(`/api/favorites/${propertyId}?user_id=${userId}`, { method: 'DELETE' });
}

export async function getFavorites(userId) {
  return apiFetch(`/api/favorites?user_id=${userId}`);
}

// ── Alerts ────────────────────────────────────────────────────────
export async function createAlert({ query, country, city, userId }) {
  const params = new URLSearchParams({ query, country, user_id: userId });
  if (city) params.set('city', city);
  return apiFetch(`/api/alerts?${params}`, { method: 'POST' });
}

export async function getAlerts(userId) {
  return apiFetch(`/api/alerts?user_id=${userId}`);
}

export async function deleteAlert(alertId, userId) {
  return apiFetch(`/api/alerts/${alertId}?user_id=${userId}`, { method: 'DELETE' });
}

// ── AI features ───────────────────────────────────────────────────
export async function aiAdvisor({ message, country, city, history = [] }) {
  const params = new URLSearchParams({ message, country });
  if (city)              params.set('city', city);
  if (history.length)    params.set('history', JSON.stringify(history));
  return apiFetch(`/api/ai/advisor?${params}`, { method: 'POST' });
}

export async function aiValuation(form) {
  const params = new URLSearchParams(
    Object.entries(form).filter(([, v]) => v != null && v !== '')
  );
  return apiFetch(`/api/ai/valuation?${params}`, { method: 'POST' });
}

export async function marketIntelligence({ country, city, area, profile }) {
  const params = new URLSearchParams({ country, city });
  if (area)    params.set('area', area);
  if (profile) params.set('profile', profile);
  return apiFetch(`/api/ai/market?${params}`);
}

// ── Currency / price helpers ──────────────────────────────────────
export const CURRENCY = {
  india: { symbol: '₹', code: 'INR' },
  uk:    { symbol: '£', code: 'GBP' },
};

export function fmtPrice(price, country = 'uk') {
  if (!price && price !== 0) return '—';
  if (country === 'india') {
    if (price >= 1e7) return `₹${(price / 1e7).toFixed(2)} Cr`;
    if (price >= 1e5) return `₹${(price / 1e5).toFixed(2)} L`;
    return `₹${price.toLocaleString('en-IN')}`;
  }
  if (price >= 1e6) return `£${(price / 1e6).toFixed(2)}M`;
  if (price >= 1e3) return `£${(price / 1e3).toFixed(0)}K`;
  return `£${price.toLocaleString()}`;
}
