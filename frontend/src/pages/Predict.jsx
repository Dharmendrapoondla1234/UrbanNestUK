import { useState } from 'react';
import { C, T, fmt, btn, PROPERTY_TYPES, UK_CITIES } from '../utils/design.js';
import { getPriceEstimate, getAIPricePrediction } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Predict() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    city: 'London', area: '', property_type: 'Flat',
    area_sqft: '', bedrooms: '', age: '0',
  });
  const [result, setResult] = useState(null);
  const [aiInsight, setAiInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const CITY_AREAS = {
    London: ['Canary Wharf', 'Shoreditch', 'Kensington', 'Chelsea', 'Brixton', 'Hackney', 'Islington', 'Clapham', 'Notting Hill', 'Greenwich'],
    Manchester: ['Ancoats', 'Didsbury', 'Salford Quays', 'Chorlton', 'Deansgate', 'Northern Quarter'],
    Birmingham: ['Edgbaston', 'Moseley', 'Digbeth', 'Harborne', 'Jewellery Quarter'],
    Leeds: ['Chapel Allerton', 'Headingley', 'Hyde Park', 'Roundhay', 'Horsforth'],
    Edinburgh: ['New Town', 'Old Town', 'Leith', 'Morningside', 'Stockbridge'],
    Bristol: ['Clifton', 'Redland', 'Stokes Croft', 'Harbourside', 'Bedminster'],
    Liverpool: ['Baltic Triangle', 'Anfield', 'Allerton', 'Wavertree', 'Sefton Park'],
    Oxford: ['Jericho', 'Cowley', 'Summertown', 'Headington', 'Botley'],
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function estimate() {
    if (!form.area_sqft) return;
    setLoading(true);
    setResult(null);
    setAiInsight('');
    try {
      const r = await getPriceEstimate({
        city: form.city,
        area: form.area || CITY_AREAS[form.city]?.[0] || form.city,
        property_type: form.property_type,
        area_sqft: form.area_sqft,
        bedrooms: form.bedrooms || undefined,
        age: form.age || 0,
      });
      setResult(r);
      if (user) {
        setAiLoading(true);
        getAIPricePrediction(form, r)
          .then(setAiInsight)
          .catch(() => {})
          .finally(() => setAiLoading(false));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return <AuthGate />;

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text,
    fontSize: 13, fontFamily: T.body,
    outline: 'none', boxSizing: 'border-box',
  };

  const lbl = text => (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>{text}</div>
  );

  return (
    <div style={{ padding: '28px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: T.display, fontSize: 28, fontWeight: 900, color: C.text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          💰 Price Prediction
        </h1>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>AI-powered property valuation for the UK market</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        {/* Form */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontFamily: T.display, fontSize: 16, fontWeight: 800, color: C.text, margin: '0 0 20px' }}>Property Details</h3>

          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              {lbl('City')}
              <select style={inputStyle} value={form.city} onChange={e => { set('city', e.target.value); set('area', ''); }}>
                {UK_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              {lbl('Area')}
              <select style={inputStyle} value={form.area} onChange={e => set('area', e.target.value)}>
                <option value="">Select area…</option>
                {(CITY_AREAS[form.city] || []).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              {lbl('Property Type')}
              <select style={inputStyle} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              {lbl('Size (sqft)')}
              <input style={inputStyle} type="number" placeholder="e.g. 850" value={form.area_sqft} onChange={e => set('area_sqft', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                {lbl('Bedrooms')}
                <select style={inputStyle} value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)}>
                  <option value="">N/A</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                {lbl('Age (years)')}
                <select style={inputStyle} value={form.age} onChange={e => set('age', e.target.value)}>
                  {[0, 1, 5, 10, 20, 30, 50].map(n => <option key={n} value={n}>{n === 0 ? 'New build' : `${n}yr`}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={estimate}
              disabled={loading || !form.area_sqft}
              style={{
                ...btn('primary', 'lg'),
                width: '100%', justifyContent: 'center',
                background: 'linear-gradient(135deg,#3b8cf8,#8b5cf6)',
                opacity: loading || !form.area_sqft ? 0.6 : 1,
                marginTop: 6,
              }}
            >
              {loading ? '⏳ Estimating…' : '🔮 Get Price Estimate'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Main price */}
              <div style={{
                background: 'linear-gradient(135deg,rgba(59,140,248,0.12),rgba(139,92,246,0.12))',
                border: '1px solid rgba(59,140,248,0.25)',
                borderRadius: 16, padding: 24, textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Estimated Price</div>
                <div style={{ fontFamily: T.display, fontSize: 42, fontWeight: 900, color: C.text, letterSpacing: '-2px' }}>{fmt(result.predicted_price)}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
                  Range: {fmt(result.price_range_low)} – {fmt(result.price_range_high)}
                </div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>
                  Confidence: {result.confidence}% · £{result.price_per_sqft}/sqft
                </div>
              </div>

              {/* Investment metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Rental Yield', value: `${result.rental_yield_pct}%`, icon: '📈' },
                  { label: 'Monthly Rental', value: fmt(result.estimated_monthly_rental).replace('£', '£') + '/mo', icon: '🏠' },
                  { label: 'Breakeven', value: `${result.breakeven_years} yrs`, icon: '⚖️' },
                  { label: 'Market Trend', value: result.market_trend, icon: '📊' },
                ].map(m => (
                  <div key={m.label} style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: '14px 16px',
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{m.icon}</div>
                    <div style={{ fontFamily: T.display, fontSize: 17, fontWeight: 900, color: C.text }}>{m.value}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Stamp duty */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                  Stamp Duty (SDLT): <span style={{ color: C.amber }}>{fmt(result.stamp_duty_estimate)}</span>
                </div>
                <div style={{ fontSize: 12, color: C.dim }}>Based on standard residential purchase rates</div>
              </div>

              {/* AI Insight */}
              {aiLoading ? (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, color: C.muted }}>🤖 Generating AI analysis…</div>
                </div>
              ) : aiInsight ? (
                <div style={{
                  background: 'linear-gradient(135deg,rgba(59,140,248,0.08),rgba(139,92,246,0.08))',
                  border: '1px solid rgba(59,140,248,0.2)',
                  borderRadius: 12, padding: 16,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>🤖 AI Analysis</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{aiInsight}</div>
                </div>
              ) : null}

              {/* Key factors */}
              {result.key_factors?.length > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Key Factors</div>
                  {result.key_factors.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                      <span style={{ color: C.muted }}>{f.factor}</span>
                      <span style={{ color: f.impact === 'positive' ? C.green : C.red, fontWeight: 700, textTransform: 'capitalize' }}>{f.impact}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: 40, textAlign: 'center', height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <div style={{ fontSize: 48 }}>🔮</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>Enter property details</div>
              <div style={{ fontSize: 13, color: C.dim }}>to get an AI-powered price estimate</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthGate() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)', gap: 16 }}>
      <div style={{ fontSize: 52 }}>💰</div>
      <h2 style={{ fontFamily: T.display, fontSize: 22, fontWeight: 900, color: C.text, margin: 0 }}>Sign in to use Price AI</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Get AI-powered property valuations for the UK market</p>
    </div>
  );
}
