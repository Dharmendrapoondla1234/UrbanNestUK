import { useState, useEffect } from 'react';
import { C, T, fmt, badge, btn } from '../../utils/design.js';
import { callGemini } from '../../services/gemini.js';
import { PROP_IMGS } from '../ui.jsx';

export default function PropertyDetail({ property, onClose }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [tab, setTab] = useState('details');
  const p = property;

  useEffect(() => {
    if (!p) return;
    setAiLoading(true);
    callGemini(
      `Analyse this property as an investment: ${JSON.stringify({ title: p.title, price: p.price, city: p.city, area: p.area, type: p.type, bedrooms: p.bedrooms, country: p.country, area_sqft: p.area_sqft })}. Give exactly 3 bullet points: 1) Investment potential & capital growth outlook, 2) Key advantages, 3) Main risks. Be specific and concise. Max 130 words.`,
      'Expert property investment analyst. Be specific, data-driven, concise.'
    )
      .then(setAiInsight)
      .catch(e => setAiInsight('⚠ ' + e.message))
      .finally(() => setAiLoading(false));
  }, [p?.id]);

  if (!p) return null;
  const images = p.images?.length > 0 ? p.images : PROP_IMGS.slice(0, 2);
  const curr = p.currency_symbol || '£';

  const row = (label, value, highlight) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: highlight ? '#4285f4' : C.text }}>{value || '—'}</span>
    </div>
  );

  const ratingBar = (label, val) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{val?.toFixed(1)}/5</span>
      </div>
      <div style={{ height: 4, background: C.border, borderRadius: 99 }}>
        <div style={{ height: 4, borderRadius: 99, width: `${((val || 0) / 5) * 100}%`, background: 'linear-gradient(90deg,#4285f4,#34a853)' }} />
      </div>
    </div>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, width: '100%', maxWidth: 860, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 100px rgba(0,0,0,0.8)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: `1px solid ${C.border}` }}>
          <div>
            <h2 style={{ fontFamily: T.display, fontSize: 18, fontWeight: 900, color: C.text, margin: 0 }}>{p.title}</h2>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>📍 {p.address || p.area || ''}, {p.city}{p.country ? ', ' + p.country : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#0d0e14', borderBottom: `1px solid ${C.border}` }}>
          {[['details','📋 Details'],['location','📍 Location'],['ai-insight','✦ AI Insight']].map(([id, label]) => (
            <div
              key={id}
              onClick={() => setTab(id)}
              style={{ padding: '12px 18px', fontSize: 13, fontWeight: 600, color: tab === id ? '#4285f4' : '#4a5568', cursor: 'pointer', borderBottom: tab === id ? '2px solid #4285f4' : '2px solid transparent', transition: 'all 0.15s' }}
            >
              {label}
            </div>
          ))}
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>

          {tab === 'details' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {/* Left */}
              <div style={{ padding: 22, borderRight: `1px solid ${C.border}` }}>
                <div style={{ height: 230, borderRadius: 12, overflow: 'hidden', background: C.card, marginBottom: 10, position: 'relative' }}>
                  <img src={images[imgIdx] || PROP_IMGS[0]} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = PROP_IMGS[0]; }} />
                </div>
                {images.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    {images.slice(0, 4).map((img, i) => (
                      <div key={i} onClick={() => setImgIdx(i)} style={{ width: 58, height: 42, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${i === imgIdx ? '#4285f4' : 'transparent'}` }}>
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = PROP_IMGS[0]; }} />
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 27, fontWeight: 900, color: C.text, fontFamily: T.display, marginBottom: 4 }}>{fmt(p.price)}</div>
                {p.price_per_sqft && <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>{curr}{p.price_per_sqft}/sqft · {p.area_sqft?.toLocaleString()} sqft</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                  {[p.bedrooms > 0 ? `🛏 ${p.bedrooms} Beds` : null, p.bathrooms > 0 ? `🚿 ${p.bathrooms} Baths` : null, p.furnishing, p.floor, p.epc_rating ? `EPC ${p.epc_rating}` : null, p.tenure].filter(Boolean).map(s => (
                    <span key={s} style={{ ...badge(s, C.muted), background: 'rgba(255,255,255,0.06)', fontSize: 11 }}>{s}</span>
                  ))}
                </div>
                {p.amenities?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Amenities</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {p.amenities.map(a => <span key={a} style={{ ...badge(a, '#4285f4'), fontSize: 11 }}>{a}</span>)}
                    </div>
                  </div>
                )}
              </div>

              {/* Right */}
              <div style={{ padding: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Property Details</div>
                {row('Type', p.type)}
                {row('City', p.city)}
                {row('Country', p.country)}
                {row('Area', p.area)}
                {row('Availability', p.availability, true)}
                {row('Council Tax', p.council_tax_band ? `Band ${p.council_tax_band}` : null)}
                {row('Nearest Station', p.nearest_station ? `${p.nearest_station} ${p.station_distance ? '('+p.station_distance+')' : ''}` : null)}
                {row('Broadband', p.broadband_speed)}
                {row('Flood Risk', p.flood_risk)}
                {p.monthly_service_charge && row('Service Charge', `£${p.monthly_service_charge}/mo`)}
                {row('Listed by', p.estate_agent)}
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Ratings</div>
                  {ratingBar('Overall', p.rating)}
                  {p.locality_rating && ratingBar('Locality', p.locality_rating)}
                  {p.safety_rating && ratingBar('Safety', p.safety_rating)}
                  {p.lifestyle_rating && ratingBar('Lifestyle', p.lifestyle_rating)}
                </div>
              </div>
            </div>
          )}

          {tab === 'location' && (
            <div style={{ padding: 22 }}>
              <div style={{ background: '#0f1829', borderRadius: 12, height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, marginBottom: 16, border: '1px solid rgba(66,133,244,0.15)' }}>
                <div style={{ fontSize: 40 }}>📍</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 3 }}>{p.address || p.title}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{p.city}{p.country ? ', ' + p.country : ''}</div>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.address || p.title) + ' ' + (p.city || '') + ' ' + (p.country || ''))}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ background: 'linear-gradient(135deg,#4285f4,#34a853)', color: '#fff', padding: '10px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  🗺 Navigate in Google Maps
                </a>
              </div>
              {p.nearest_station && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 13, color: C.muted }}>
                  🚉 Nearest station: <strong style={{ color: C.text }}>{p.nearest_station}</strong>{p.station_distance ? ' (' + p.station_distance + ')' : ''}
                </div>
              )}
            </div>
          )}

          {tab === 'ai-insight' && (
            <div style={{ padding: 22 }}>
              <div style={{ background: 'linear-gradient(135deg,rgba(66,133,244,0.08),rgba(52,168,83,0.08))', border: '1px solid rgba(66,133,244,0.25)', borderRadius: 12, padding: 18, minHeight: 120 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ background: 'linear-gradient(135deg,#4285f4,#34a853)', color: '#fff', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>✦ Gemini AI</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#4285f4' }}>Investment Analysis</span>
                </div>
                {aiLoading ? (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, background: '#4285f4', borderRadius: '50%', animation: `dot 1.2s infinite ${i*0.2}s` }} />)}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#c8d4e8', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{aiInsight}</div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
