import { useState } from 'react';
import { C, T, fmt, badge } from '../../utils/design.js';

export default function PropertyCard({ property, onClick }) {
  const [imgIdx, setImgIdx] = useState(0);
  const p = property;

  const images = p.images || [];
  const img = images[imgIdx] || images[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80';

  const availColor = {
    'Available Now': C.green,
    'Under Offer': C.amber,
    'Coming Soon': C.blue,
    'New Build': C.purple,
  }[p.availability] || C.muted;

  return (
    <div
      onClick={() => onClick?.(p)}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.border = `1px solid rgba(59,140,248,0.4)`;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.border = `1px solid ${C.border}`;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden', background: C.surface }}>
        <img
          src={img}
          alt={p.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80'; }}
        />
        {/* Image nav dots */}
        {images.length > 1 && (
          <div style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 4,
          }}>
            {images.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setImgIdx(i); }} style={{
                width: 6, height: 6, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: i === imgIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                padding: 0,
              }} />
            ))}
          </div>
        )}
        {/* Badges */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ ...badge(p.availability, availColor), fontSize: 10 }}>{p.availability}</span>
          {p.featured && <span style={{ ...badge('⭐ Featured', C.amber), fontSize: 10 }}>⭐ Featured</span>}
          {p.verified && <span style={{ ...badge('✓ Verified', C.green), fontSize: 10 }}>✓ Verified</span>}
        </div>
        {p.has_virtual_tour && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            ...badge('360°', C.purple), fontSize: 10,
          }}>360°</div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4, fontFamily: T.display, lineHeight: 1.2 }}>
          {fmt(p.price)}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8 }}>{p.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.dim, marginBottom: 10 }}>
          <span>📍</span> {p.area}, {p.city}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: C.muted, marginBottom: 10, flexWrap: 'wrap' }}>
          {p.bedrooms > 0 && <span>🛏 {p.bedrooms} bed</span>}
          {p.bathrooms > 0 && <span>🚿 {p.bathrooms} bath</span>}
          <span>📐 {p.area_sqft?.toLocaleString()} sqft</span>
          {p.epc_rating && <span>🌿 EPC {p.epc_rating}</span>}
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C.dim }}>{p.tenure}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: C.amber, fontSize: 13 }}>★</span>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{p.rating?.toFixed(1)}</span>
          </div>
        </div>

        {/* Agent */}
        {p.estate_agent && (
          <div style={{ marginTop: 8, fontSize: 11, color: C.dim, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
            via {p.estate_agent}
          </div>
        )}
      </div>
    </div>
  );
}
