import { useState, useEffect } from 'react';
import { C, T, fmt, badge, btn } from '../../utils/design.js';
import { getAIPropertyInsight } from '../../services/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function PropertyDetail({ property, onClose }) {
  const { user } = useAuth();
  const [imgIdx, setImgIdx] = useState(0);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const p = property;

  useEffect(() => {
    if (user && p) {
      setAiLoading(true);
      getAIPropertyInsight(p)
        .then(setAiInsight)
        .catch(() => setAiInsight(''))
        .finally(() => setAiLoading(false));
    }
  }, [p?.id, user]);

  if (!p) return null;
  const images = p.images || [];

  const row = (label, value, highlight) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: highlight ? C.blue : C.text }}>{value || '—'}</span>
    </div>
  );

  const ratingBar = (label, val) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{val?.toFixed(1)}/5</span>
      </div>
      <div style={{ height: 4, background: C.border, borderRadius: 99 }}>
        <div style={{ height: 4, borderRadius: 99, width: `${(val / 5) * 100}%`, background: `linear-gradient(90deg,#3b8cf8,#8b5cf6)` }} />
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 20, width: '100%', maxWidth: 860, maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 100px rgba(0,0,0,0.8)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
          <div>
            <h2 style={{ fontFamily: T.display, fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>{p.title}</h2>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>📍 {p.address}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {/* Left: Images + details */}
            <div style={{ padding: 24, borderRight: `1px solid ${C.border}` }}>
              {/* Image gallery */}
              <div style={{ height: 240, borderRadius: 12, overflow: 'hidden', background: C.card, marginBottom: 12, position: 'relative' }}>
                <img
                  src={images[imgIdx] || images[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80'}
                  alt={p.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80'; }}
                />
              </div>
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {images.map((img, i) => (
                    <div key={i} onClick={() => setImgIdx(i)} style={{
                      width: 60, height: 44, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                      border: `2px solid ${i === imgIdx ? C.blue : 'transparent'}`,
                    }}>
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80'; }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Price */}
              <div style={{ fontSize: 28, fontWeight: 900, color: C.text, fontFamily: T.display, marginBottom: 6 }}>{fmt(p.price)}</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>£{p.price_per_sqft}/sqft · {p.area_sqft?.toLocaleString()} sqft total</div>

              {/* Quick stats */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  p.bedrooms > 0 ? `🛏 ${p.bedrooms} Beds` : null,
                  p.bathrooms > 0 ? `🚿 ${p.bathrooms} Baths` : null,
                  p.furnishing,
                  p.floor,
                  `EPC ${p.epc_rating}`,
                  p.tenure,
                ].filter(Boolean).map(s => (
                  <span key={s} style={{ ...badge(s, C.muted), background: 'rgba(255,255,255,0.06)', fontSize: 11 }}>{s}</span>
                ))}
              </div>

              {/* Amenities */}
              {p.amenities?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Amenities</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {p.amenities.map(a => (
                      <span key={a} style={{ ...badge(a, C.blue), fontSize: 11 }}>{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Details + ratings */}
            <div style={{ padding: 24 }}>
              {/* Key details */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Property Details</div>
                {row('Type', p.type)}
                {row('City', p.city)}
                {row('Area', p.area)}
                {row('Availability', p.availability, true)}
                {row('Council Tax', `Band ${p.council_tax_band}`)}
                {row('Nearest Station', `${p.nearest_station} (${p.station_distance})`)}
                {row('Broadband', p.broadband_speed)}
                {row('Flood Risk', p.flood_risk)}
                {row('Neighbourhood', p.neighborhood_culture)}
                {p.monthly_service_charge && row('Service Charge', `£${p.monthly_service_charge}/mo`)}
              </div>

              {/* Ratings */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Ratings</div>
                {ratingBar('Overall', p.rating)}
                {ratingBar('Locality', p.locality_rating)}
                {ratingBar('Safety', p.safety_rating)}
                {ratingBar('Lifestyle', p.lifestyle_rating)}
              </div>

              {/* AI Insight */}
              {user && (
                <div style={{
                  background: 'linear-gradient(135deg,rgba(59,140,248,0.1),rgba(139,92,246,0.1))',
                  border: '1px solid rgba(59,140,248,0.2)',
                  borderRadius: 12, padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>🤖</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.8px' }}>AI Investment Insight</span>
                  </div>
                  {aiLoading ? (
                    <div style={{ fontSize: 12, color: C.muted }}>Analysing property…</div>
                  ) : aiInsight ? (
                    <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{aiInsight}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: C.dim }}>Configure VITE_GEMINI_KEY for AI insights.</div>
                  )}
                </div>
              )}

              {/* Agent */}
              <div style={{ marginTop: 16, padding: 12, background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, color: C.muted }}>Listed by <strong style={{ color: C.text }}>{p.estate_agent}</strong></div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>Ref: {p.rightmove_id}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
