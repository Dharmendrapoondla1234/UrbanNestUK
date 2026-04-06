import { useState, useEffect, useRef } from 'react';
import { C } from '../utils/design.js';

export const PROP_IMGS = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=80',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=400&q=80',
  'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=400&q=80',
];

export const COUNTRIES = [
  'United Kingdom','United States','Australia','Canada','Germany',
  'France','Spain','Italy','UAE','Singapore','India','Japan','Netherlands','New Zealand','Ireland',
];

export function fmtPrice(n, c = '£') {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `${c}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${c}${(n / 1_000).toFixed(0)}K`;
  return `${c}${Number(n).toLocaleString()}`;
}

export function Spinner({ size = 16 }) {
  return (
    <div style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid rgba(66,133,244,0.3)`, borderTopColor: '#4285f4',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  );
}

export function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, background: '#4285f4', borderRadius: '50%',
          animation: `dot 1.2s infinite ${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

export function AISuggestInput({ placeholder, value, onChange, fetchSuggestions, style = {} }) {
  const [sugg, setSugg] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrapRef = useRef(null);

  function handleChange(v) {
    onChange(v);
    clearTimeout(timer.current);
    if (v.length < 2) { setSugg([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try { const s = await fetchSuggestions(v); setSugg(s || []); setOpen((s || []).length > 0); }
      catch {}
      setLoading(false);
    }, 550);
  }

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: 'relative', ...style }}>
      <div style={{ position: 'relative' }}>
        <input
          value={value}
          placeholder={placeholder}
          onChange={e => handleChange(e.target.value)}
          style={{ width: '100%', paddingRight: loading ? 36 : 12 }}
        />
        {loading && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <Spinner />
          </div>
        )}
      </div>
      {open && sugg.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#1a1d26', border: '1px solid rgba(66,133,244,0.35)',
          borderRadius: 8, zIndex: 999, maxHeight: 220, overflowY: 'auto',
          marginTop: 4, boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        }}>
          {sugg.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => { onChange(s); setSugg([]); setOpen(false); }}
              style={{
                padding: '10px 14px', fontSize: 13, cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                color: '#f0f2f8',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(66,133,244,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GeminiBadge({ text = '✦ Gemini' }) {
  return (
    <span style={{
      background: 'linear-gradient(135deg,#4285f4,#34a853)',
      color: '#fff', padding: '3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 700, flexShrink: 0,
    }}>{text}</span>
  );
}

export function AIBox({ children, style = {} }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(66,133,244,0.08),rgba(52,168,83,0.08))',
      border: '1px solid rgba(66,133,244,0.25)',
      borderRadius: 10, padding: 14, ...style,
    }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
      {children}
    </div>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, ...style }}>
      {children}
    </div>
  );
}
