import { C } from '../../utils/design.js';
import { fmtPrice, PROP_IMGS } from '../ui.jsx';

export default function PropertyCard({ p, onClick }) {
  const curr = p.currency_symbol || '£';
  const img = p.images?.[0] || PROP_IMGS[Math.abs(p.id || 0) % PROP_IMGS.length];

  return (
    <div
      onClick={onClick}
      style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
        overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(66,133,244,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ''; }}
    >
      <div style={{ height: 178, overflow: 'hidden', position: 'relative' }}>
        <img src={img} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = PROP_IMGS[0]; }} />
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <span style={{ background: 'rgba(0,0,0,0.72)', color: '#f0f2f8', padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>🏠 {p.type}</span>
        </div>
        {p.verified && (
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <span style={{ background: 'rgba(52,168,83,0.9)', color: '#fff', padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>✓ Verified</span>
          </div>
        )}
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 19, fontWeight: 900, color: '#f0f2f8', marginBottom: 1 }}>{fmtPrice(p.price, curr)}</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>📍 {p.area || p.city || ''}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 8, lineHeight: 1.35 }}>{p.title}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          {p.bedrooms > 0 && <span style={{ fontSize: 11, color: C.muted }}>🛏 {p.bedrooms} bed</span>}
          {p.bathrooms > 0 && <span style={{ fontSize: 11, color: C.muted }}>🚿 {p.bathrooms} bath</span>}
          {p.area_sqft && <span style={{ fontSize: 11, color: C.muted }}>{p.area_sqft} sqft</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fbbc04', fontSize: 12 }}>{'★'.repeat(Math.min(5, Math.round(p.rating || 4)))}</span>
          <span style={{ fontSize: 11, color: '#4285f4', fontWeight: 700 }}>{p.city}</span>
        </div>
      </div>
    </div>
  );
}
