export const C = {
  bg:       '#070910',
  surface:  '#0f111a',
  card:     '#141720',
  border:   'rgba(255,255,255,0.07)',
  borderHi: 'rgba(99,179,237,0.35)',
  text:     '#eef2ff',
  muted:    '#7b8ab8',
  dim:      '#3d4566',
  blue:     '#4f9eff',
  indigo:   '#818cf8',
  purple:   '#a78bfa',
  green:    '#34d399',
  red:      '#f87171',
  amber:    '#fbbf24',
  teal:     '#2dd4bf',
  cyan:     '#22d3ee',
};

export const T = {
  display: "'Syne', 'Space Grotesk', system-ui, sans-serif",
  body:    "'DM Sans', 'Outfit', system-ui, sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

export function fmt(n, symbol = '£') {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${symbol}${(n / 1_000).toFixed(0)}K`;
  return `${symbol}${n.toLocaleString()}`;
}

export function badge(color = '#4f9eff') {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 9px', borderRadius: 99,
    fontSize: 10, fontWeight: 700, color,
    background: color + '1a', border: `1px solid ${color}33`,
    letterSpacing: '0.3px', fontFamily: "'DM Sans', sans-serif",
  };
}

export function btn(variant = 'primary', size = 'md') {
  const pad = { sm: '7px 14px', md: '10px 20px', lg: '13px 28px' }[size];
  const fs  = { sm: 11, md: 13, lg: 15 }[size];
  const vars = {
    primary:   { background: 'linear-gradient(135deg,#4f9eff,#818cf8)', color: '#fff', border: 'none' },
    secondary: { background: 'transparent', color: '#4f9eff', border: '1px solid rgba(79,158,255,0.4)' },
    ghost:     { background: 'rgba(255,255,255,0.04)', color: '#7b8ab8', border: '1px solid rgba(255,255,255,0.07)' },
    danger:    { background: '#f87171', color: '#fff', border: 'none' },
    teal:      { background: 'linear-gradient(135deg,#2dd4bf,#22d3ee)', color: '#070910', border: 'none' },
  };
  return {
    padding: pad, fontSize: fs,
    ...vars[variant],
    borderRadius: 10, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.2px',
    transition: 'all 0.18s', display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1,
  };
}

export function inputStyle(focused = false) {
  return {
    width: '100%', padding: '11px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${focused ? 'rgba(79,158,255,0.6)' : 'rgba(255,255,255,0.07)'}`,
    borderRadius: 10, color: '#eef2ff',
    fontSize: 14, fontFamily: "'DM Sans', sans-serif",
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
  };
}

export const PROPERTY_TYPES = [
  'Flat', 'Terraced House', 'Semi-Detached', 'Detached House',
  'Bungalow', 'Maisonette', 'Studio', 'Penthouse', 'Commercial', 'Land',
];

export const PROPERTY_ICONS = {
  'Flat':'🏢','Terraced House':'🏘️','Semi-Detached':'🏠','Detached House':'🏡',
  'Bungalow':'🏠','Maisonette':'🏙️','Studio':'🏬','Penthouse':'🌆','Commercial':'🏪','Land':'🌿',
};

export const SORT_OPTIONS = [
  { value: 'featured', label: '⭐ Featured' },
  { value: 'price_asc', label: '↑ Lowest Price' },
  { value: 'price_desc', label: '↓ Highest Price' },
  { value: 'rating', label: '★ Top Rated' },
  { value: 'area', label: '📐 Largest' },
];
