// ── Design tokens ────────────────────────────────────────────
export const C = {
  bg:      '#0a0b0f',
  surface: '#12141a',
  card:    '#181b24',
  border:  'rgba(255,255,255,0.07)',
  text:    '#f0f2f8',
  muted:   '#8892a4',
  dim:     '#4a5568',
  blue:    '#3b8cf8',
  purple:  '#8b5cf6',
  green:   '#22c55e',
  red:     '#ef4444',
  amber:   '#f59e0b',
  teal:    '#14b8a6',
};

export const T = {
  display: "'Inter', 'Segoe UI', system-ui, sans-serif",
  body:    "'Inter', 'Segoe UI', system-ui, sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
};

export function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n.toLocaleString()}`;
}

export function fmtK(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function badge(label, color = C.blue, bg) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 700,
    color,
    background: bg || color + '22',
    letterSpacing: '0.3px',
  };
}

export function btn(variant = 'primary', size = 'md') {
  const sizes = {
    sm: { padding: '7px 14px', fontSize: 12 },
    md: { padding: '10px 20px', fontSize: 13 },
    lg: { padding: '13px 28px', fontSize: 15 },
  };
  const variants = {
    primary: { background: C.blue, color: '#fff', border: 'none' },
    secondary: { background: 'transparent', color: C.blue, border: `1px solid ${C.blue}` },
    ghost: { background: 'transparent', color: C.muted, border: `1px solid ${C.border}` },
    danger: { background: C.red, color: '#fff', border: 'none' },
  };
  return {
    ...sizes[size],
    ...variants[variant],
    borderRadius: 9,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: T.body,
    letterSpacing: '0.2px',
    transition: 'all 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

export const PROPERTY_TYPES = [
  'Flat', 'Terraced House', 'Semi-Detached', 'Detached House',
  'Bungalow', 'Maisonette', 'Studio', 'Penthouse', 'Commercial', 'Land',
];

export const PROPERTY_ICONS = {
  'Flat': '🏢',
  'Terraced House': '🏘️',
  'Semi-Detached': '🏠',
  'Detached House': '🏡',
  'Bungalow': '🏠',
  'Maisonette': '🏙️',
  'Studio': '🏬',
  'Penthouse': '🌆',
  'Commercial': '🏢',
  'Land': '🌿',
};

export const UK_CITIES = ['London','Manchester','Birmingham','Leeds','Edinburgh','Bristol','Liverpool','Oxford'];

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'area', label: 'Largest First' },
];
