import { useState, useEffect } from 'react';
import { C, T, fmt, badge, btn } from '../../utils/design.js';
import { getCurrency } from '../../services/api.js';
import { getPropertyInsight } from '../../services/gemini.js';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function PropertyDetail({ property: p, onClose, country = 'United Kingdom' }) {
  const { user } = useAuth();
  const [imgIdx, setImgIdx] = useState(0);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const { symbol } = getCurrency(country);

  useEffect(() => {
    if (!p || !user) return;
    setInsightLoading(true);
    getPropertyInsight(p)
      .then(t => setInsight(t || ''))
      .catch(() => setInsight(''))
      .finally(() => setInsightLoading(false));
  }, [p?.id, user]);

  if (!p) return null;
  const imgs = p.images || [];

  function openMaps() {
    const q = p.lat && p.lng ? `${p.lat},${p.lng}` : encodeURIComponent(p.address || p.title);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  }

  function openDirections() {
    const q = p.lat && p.lng ? `${p.lat},${p.lng}` : encodeURIComponent(p.address || p.title);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, '_blank');
  }

  const row = (label, value, hi) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: hi ? C.blue : C.text }}>{value}</span>
    </div>
  ) : null;

  const bar = (label, val) => (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{val?.toFixed(1)}/5</span>
      </div>
      <div style={{ height: 3, background: C.border, borderRadius: 99 }}>
        <div style={{ height: 3, borderRadius: 99, width: `${(val / 5) * 100}%`, background: 'linear-gradient(90deg,#4f9eff,#818cf8)' }} />
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 20, width: '100%', maxWidth: 880, maxHeight: '92vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 120px rgba(0,0,0,0.9)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: T.display, fontSize: 18, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.3px' }}>{p.title}</h2>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>📍 {p.address || `${p.area}, ${p.city}`}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={openDirections} style={{ ...btn('teal', 'sm'), fontSize: 11 }}>🧭 Directions</button>
            <button onClick={openMaps} style={{ ...btn('secondary', 'sm'), fontSize: 11 }}>🗺 View on Map</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer' }}>×</button>
          </div>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Left */}
            <div style={{ padding: 22, borderRight: `1px solid ${C.border}` }}>
              {/* Gallery */}
              <div style={{ height: 230, borderRadius: 12, overflow: 'hidden', background: C.card, marginBottom: 10, position: 'relative' }}>
                <img src={imgs[imgIdx] || imgs[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80'} alt={p.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80'; }} />
              </div>
              {imgs.length > 1 && (
                <div style={{ display: 'flex', gap: 7, marginBottom: 14, overflowX: 'auto' }}>
                  {imgs.map((img, i) => (
                    <div key={i} onClick={() => setImgIdx(i)} style={{
                      width: 56, height: 42, borderRadius: 7, overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                      border: `2px solid ${i === imgIdx ? C.blue : 'transparent'}`,
                    }}>
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&q=60'; }} />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontFamily: T.display, fontSize: 30, fontWeight: 900, color: C.text, marginBottom: 4, letterSpacing: '-1px' }}>
                {fmt(p.price, symbol)}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
                {symbol}{p.price_per_sqft}/sqft · {p.area_sqft?.toLocaleString()} sqft
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {[p.bedrooms > 0 ? `🛏 ${p.bedrooms} Beds` : null, p.bathrooms > 0 ? `🚿 ${p.bathrooms} Baths` : null, p.furnishing, p.floor, `EPC ${p.epc_rating}`, p.tenure].filter(Boolean).map(s => (
                  <span key={s} style={{ ...badge(C.muted), background: 'rgba(255,255,255,0.05)', fontSize: 10 }}>{s}</span>
                ))}
              </div>

              {/* Amenities */}
              {p.amenities?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>Amenities</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {p.amenities.map(a => <span key={a} style={{ ...badge(C.blue), fontSize: 10 }}>{a}</span>)}
                  </div>
                </div>
              )}

              {/* AI Insight */}
              <div style={{ marginTop: 16, background: 'linear-gradient(135deg,rgba(79,158,255,0.08),rgba(129,140,248,0.08))', border: '1px solid rgba(79,158,255,0.2)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>🤖 AI Insight</div>
                {!user ? (
                  <div style={{ fontSize: 12, color: C.dim }}>Sign in for AI-powered analysis</div>
                ) : insightLoading ? (
                  <div style={{ fontSize: 12, color: C.muted }}>Analysing property…</div>
                ) : insight ? (
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{insight}</div>
                ) : (
                  <div style={{ fontSize: 12, color: C.dim }}>Configure VITE_GEMINI_KEY for AI insights.</div>
                )}
              </div>
            </div>

            {/* Right */}
            <div style={{ padding: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Property Details</div>
              {row('Type', p.type)}
              {row('City / Area', `${p.area}, ${p.city}`)}
              {row('Availability', p.availability, true)}
              {row('Council Tax', `Band ${p.council_tax_band}`)}
              {row('Nearest Station', `${p.nearest_station} (${p.station_distance})`)}
              {row('Broadband', p.broadband_speed)}
              {row('Flood Risk', p.flood_risk)}
              {row('Neighbourhood', p.neighborhood_culture)}
              {p.monthly_service_charge && row('Service Charge', `${symbol}${p.monthly_service_charge}/mo`)}
              {row('Estate Agent', p.estate_agent)}

              <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '16px 0 12px' }}>Ratings</div>
              {bar('Overall', p.rating)}
              {bar('Locality', p.locality_rating)}
              {bar('Safety', p.safety_rating)}
              {bar('Lifestyle', p.lifestyle_rating)}

              {/* Map preview / navigate CTA */}
              <div style={{ marginTop: 16, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg,rgba(45,212,191,0.1),rgba(34,211,238,0.1))', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.teal }}>📍 Location</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{p.address || `${p.area}, ${p.city}`}</div>
                  {p.lat && p.lng && <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{p.lat.toFixed(4)}°N, {Math.abs(p.lng).toFixed(4)}°W</div>}
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>
                  <button onClick={openDirections} style={{ ...btn('teal', 'sm'), flex: 1, justifyContent: 'center', fontSize: 11 }}>🧭 Get Directions</button>
                  <button onClick={openMaps} style={{ ...btn('ghost', 'sm'), flex: 1, justifyContent: 'center', fontSize: 11 }}>🗺 Street View</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
