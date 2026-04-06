const BASE = import.meta.env.VITE_API_BASE || 'https://urbannestuk.onrender.com';

export async function searchProperties(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '')
  ).toString();
  const res = await fetch(`${BASE}/api/properties/search?${qs}`);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  const seen = new Set();
  data.items = (data.items || []).filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  return data;
}

export async function getFeatured(limit = 6) {
  const res = await fetch(`${BASE}/api/properties/featured?limit=${limit}`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export async function getProperty(id) {
  const res = await fetch(`${BASE}/api/properties/${id}`);
  if (!res.ok) throw new Error('Not found');
  return res.json();
}

export async function getCities() {
  const res = await fetch(`${BASE}/api/cities`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export async function getMarketDataFromBackend(city, area) {
  const res = await fetch(`${BASE}/api/market/${encodeURIComponent(city)}/${encodeURIComponent(area)}`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export async function getPriceEstimateFromBackend(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/api/price-estimate?${qs}`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export const CURRENCY_MAP = {
  'United Kingdom': { symbol: '£', code: 'GBP' },
  'United States':  { symbol: '$', code: 'USD' },
  'India':          { symbol: '₹', code: 'INR' },
  'Australia':      { symbol: 'A$', code: 'AUD' },
  'Canada':         { symbol: 'C$', code: 'CAD' },
  'UAE':            { symbol: 'AED', code: 'AED' },
  'Singapore':      { symbol: 'S$', code: 'SGD' },
  'Germany':        { symbol: '€', code: 'EUR' },
  'France':         { symbol: '€', code: 'EUR' },
  default:          { symbol: '£', code: 'GBP' },
};

export function getCurrency(country) {
  return CURRENCY_MAP[country] || CURRENCY_MAP.default;
}

export function fmtPrice(n, country = 'United Kingdom') {
  if (!n && n !== 0) return '—';
  const { symbol } = getCurrency(country);
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${symbol}${(n / 1_000).toFixed(0)}K`;
  return `${symbol}${n.toLocaleString()}`;
}
