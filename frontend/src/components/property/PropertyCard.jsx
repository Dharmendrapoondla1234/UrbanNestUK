import { useState } from 'react';
import { C, T, fmt, badge, btn } from '../../utils/design.js';
import { getCurrency } from '../../services/api.js';

export default function PropertyCard({ property: p, onClick, country = 'United Kingdom' }) {
  const [imgIdx, setImgIdx] = useState(0);
  const { symbol } = getCurrency(country);
  const imgs = p.images || [];
  const img = imgs[imgIdx] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80';

  const availColor = { 'Available Now': C.green, 'Under Offer': C.amber, 'Coming Soon': C.blue, 'New Build': C.purple }[p.availability] || C.muted;

  function openMaps(e) {
    e.stopPropagation();
    if (p.lat && p.lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`, '_blank');
    } else if (p.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`, '_blank');
    }
  }

  return (
    <div
      onClick={() => onClick?.(p)}
      style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(79,158,255,0.4)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 195, overflow: 'hidden', background: C.surface }}>
        <img src={img} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80'; }} />
        {imgs.length > 1 && (
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
            {imgs.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setImgIdx(i); }} style={{
                width: 5, height: 5, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
                background: i === imgIdx ? '#fff' : 'rgba(255,255,255,0.4)',
              }} />
            ))}
          </div>
        )}
        {/* Badges */}
        <div style={{ position: 'absolute', top: 9, left: 9, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ ...badge(availColor), fontSize: 9 }}>{p.availability}</span>
          {p.featured && <span style={{ ...badge(C.amber), fontSize: 9 }}>⭐ Featured</span>}
          {p.verified && <span style={{ ...badge(C.green), fontSize: 9 }}>✓ Verified</span>}
        </div>
        {p.has_virtual_tour && (
          <div style={{ position: 'absolute', top: 9, right: 9, ...badge(C.purple), fontSize: 9 }}>360°</div>
        )}
        {/* Navigate button */}
        <button
          onClick={openMaps}
          style={{
            position: 'absolute', bottom: 9, right: 9,
            background: 'rgba(7,9,16,0.8)', backdropFilter: 'blur(8px)',
            border: `1px solid rgba(79,158,255,0.3)`,
            borderRadius: 7, padding: '4px 8px',
            color: C.blue, fontSize: 10, fontWeight: 700, fontFamily: T.body,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}
          title="Open in Google Maps"
        >
          ◎ Navigate
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '13px 14px' }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 3, fontFamily: T.display, letterSpacing: '-0.3px' }}>
          {fmt(p.price, symbol)}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 7, lineHeight: 1.3 }}>{p.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.dim, marginBottom: 9 }}>
          <span>📍</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.area}, {p.city}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: C.muted, marginBottom: 9, flexWrap: 'wrap' }}>
          {p.bedrooms > 0 && <span>🛏 {p.bedrooms}</span>}
          {p.bathrooms > 0 && <span>🚿 {p.bathrooms}</span>}
          <span>📐 {p.area_sqft?.toLocaleString()} sqft</span>
          {p.epc_rating && <span>🌿 {p.epc_rating}</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 9 }}>
          <span style={{ fontSize: 10, color: C.dim }}>{p.tenure}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ color: C.amber, fontSize: 11 }}>★</span>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{p.rating?.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
