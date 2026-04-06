import { useState } from 'react';
import { C, T, fmt, btn, PROPERTY_TYPES } from '../utils/design.js';
import { getPricePrediction, generateAreasForCity, GeminiError } from '../services/gemini.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useGlobal } from '../hooks/useGlobal.jsx';

const CONDITIONS = ['New Build', 'Excellent', 'Good', 'Fair', 'Needs Work'];
const PARKING_OPT = ['None', 'On-street', 'Allocated Space', 'Garage', 'Double Garage'];

export default function Predict() {
  const { user } = useAuth();
  const { country, city: globalCity, cities } = useGlobal();

  const [form, setForm] = useState({
    city: globalCity || '', area: '',
    property_type: 'Flat', size_sqft: '', bedrooms: '',
    bathrooms: '', age_years: '', condition: 'Good',
    floor: '', parking: 'None', garden: false,
    features: '',
  });
  const [areas, setAreas]       = useState([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [customCity, setCustomCity] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function loadAreas(city) {
    setAreasLoading(true);
    const list = await generateAreasForCity(city, country);
    setAreas(list);
    setAreasLoading(false);
  }

  function handleCityChange(val) {
    set('city', val);
    set('area', '');
    if (val) loadAreas(val);
  }

  async function runPrediction() {
    const cityVal = customCity || form.city;
    if (!cityVal || !form.property_type) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await getPricePrediction({ ...form, city: cityVal, country });
      setResult(r);
    } catch (e) {
      setError(e instanceof GeminiError ? e : { code: 'UNKNOWN', message: e.message });
    } finally {
      setLoading(false);
    }
  }

  if (!user) return <AuthGate />;

  const sel = {
    width: '100%', padding: '9px 11px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
    borderRadius: 9, color: C.text, fontSize: 13, fontFamily: T.body, outline: 'none',
  };
  const inp = { ...sel };
  const lbl = t => <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 5 }}>{t}</div>;

  const sym = result?.currency_symbol || '£';

  return (
    <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: T.display, fontSize: 26, fontWeight: 900, color: C.text, margin: '0 0 5px', letterSpacing: '-0.5px' }}>
          ◇ AI Price Prediction
        </h1>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Enter any property details — AI generates a live valuation with investment analysis</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Form */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: T.display, marginBottom: 18 }}>Property Parameters</div>

          <div style={{ display: 'grid', gap: 12 }}>
            {/* City — free text OR dropdown */}
            <div>
              {lbl('City')}
              <div style={{ display: 'flex', gap: 7 }}>
                <select style={{ ...sel, flex: 1 }} value={form.city} onChange={e => handleCityChange(e.target.value)}>
                  <option value="">Select city…</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input style={{ ...inp, width: 120, flex: '0 0 120px' }} placeholder="Or type any…"
                  value={customCity} onChange={e => setCustomCity(e.target.value)} />
              </div>
            </div>

            {/* Area */}
            <div>
              {lbl('Area / Neighbourhood')}
              <div style={{ display: 'flex', gap: 7 }}>
                <select style={{ ...sel, flex: 1 }} value={form.area} onChange={e => set('area', e.target.value)} disabled={areasLoading}>
                  <option value="">{areasLoading ? 'Loading AI areas…' : 'Select area…'}</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <input style={{ ...inp, width: 120, flex: '0 0 120px' }} placeholder="Or type any…"
                  value={form.area} onChange={e => set('area', e.target.value)} />
              </div>
            </div>

            <div>
              {lbl('Property Type')}
              <select style={sel} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                {lbl('Size (sqft)')}
                <input style={inp} type="number" placeholder="e.g. 850" value={form.size_sqft} onChange={e => set('size_sqft', e.target.value)} />
              </div>
              <div>
                {lbl('Bedrooms')}
                <select style={sel} value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)}>
                  <option value="">N/A</option>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                {lbl('Bathrooms')}
                <select style={sel} value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)}>
                  <option value="">N/A</option>
                  {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                {lbl('Age (years)')}
                <input style={inp} type="number" placeholder="0 = new build" value={form.age_years} onChange={e => set('age_years', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                {lbl('Condition')}
                <select style={sel} value={form.condition} onChange={e => set('condition', e.target.value)}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                {lbl('Floor')}
                <input style={inp} placeholder="e.g. Ground, 3rd…" value={form.floor} onChange={e => set('floor', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                {lbl('Parking')}
                <select style={sel} value={form.parking} onChange={e => set('parking', e.target.value)}>
                  {PARKING_OPT.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 18 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.muted }}>
                  <input type="checkbox" checked={form.garden} onChange={e => set('garden', e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: C.blue }} />
                  Garden / Outdoor
                </label>
              </div>
            </div>

            <div>
              {lbl('Additional Features (optional)')}
              <input style={inp} placeholder="e.g. Balcony, Smart home, Period features, EPC A…"
                value={form.features} onChange={e => set('features', e.target.value)} />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 9 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 3 }}>⚠️ {error.code?.replace(/_/g,' ')}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{error.message}</div>
              </div>
            )}

            <button
              onClick={runPrediction}
              disabled={loading || (!form.city && !customCity)}
              style={{ ...btn('primary', 'lg'), width: '100%', justifyContent: 'center', marginTop: 4, opacity: loading || (!form.city && !customCity) ? 0.6 : 1 }}
            >
              {loading ? '⏳ AI Valuing Property…' : '🔮 Generate Valuation'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          {result ? <PredictionResults r={result} sym={sym} /> : (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: 40, textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            }}>
              <div style={{ fontSize: 52 }}>◇</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.muted, fontFamily: T.display }}>AI Valuation Ready</div>
              <div style={{ fontSize: 13, color: C.dim, maxWidth: 220, lineHeight: 1.5 }}>Fill in the property details and click Generate Valuation</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PredictionResults({ r, sym }) {
  const ratingColor = { 'Excellent': C.green, 'Good': C.blue, 'Moderate': C.amber, 'Below Average': C.red }[r.investment_rating] || C.muted;
  const sentColor   = { 'Rising': C.green, 'Stable': C.blue, 'Cooling': C.amber }[r.market_sentiment] || C.muted;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Main price */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(79,158,255,0.1),rgba(129,140,248,0.1))',
        border: '1px solid rgba(79,158,255,0.25)', borderRadius: 16, padding: '22px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>AI Estimated Value</div>
        <div style={{ fontFamily: T.display, fontSize: 44, fontWeight: 900, color: C.text, letterSpacing: '-2px', lineHeight: 1 }}>
          {sym}{r.estimated_price?.toLocaleString()}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 7 }}>
          Range: {sym}{r.price_range_low?.toLocaleString()} – {sym}{r.price_range_high?.toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>Confidence: {r.confidence_pct}%</div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: '📈', label: 'Rental Yield', value: `${r.gross_rental_yield}%`, color: C.teal },
          { icon: '🏠', label: 'Monthly Rent', value: `${sym}${r.estimated_monthly_rent?.toLocaleString()}`, color: C.text },
          { icon: '📊', label: 'Annual Growth', value: `+${r.annual_growth_pct}%`, color: C.green },
          { icon: '⚖️', label: 'Investment', value: r.investment_rating, color: ratingColor },
          { icon: '📉', label: 'Market', value: r.market_sentiment, color: sentColor },
          { icon: '💷', label: 'Stamp Duty', value: `${sym}${r.stamp_duty?.toLocaleString()}`, color: C.amber },
        ].map(m => (
          <div key={m.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '13px 15px' }}>
            <div style={{ fontSize: 17, marginBottom: 5 }}>{m.icon}</div>
            <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 900, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* AI Analysis */}
      {r.ai_analysis && (
        <div style={{ background: 'linear-gradient(135deg,rgba(79,158,255,0.07),rgba(129,140,248,0.07))', border: '1px solid rgba(79,158,255,0.18)', borderRadius: 12, padding: 15 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>🤖 AI Analysis</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{r.ai_analysis}</div>
        </div>
      )}

      {/* Drivers & Risks */}
      {(r.key_value_drivers?.length > 0 || r.risk_factors?.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {r.key_value_drivers?.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 9 }}>✓ Value Drivers</div>
              {r.key_value_drivers.map((d, i) => <div key={i} style={{ fontSize: 12, color: C.muted, marginBottom: 5 }}>• {d}</div>)}
            </div>
          )}
          {r.risk_factors?.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 9 }}>⚠ Risk Factors</div>
              {r.risk_factors.map((r, i) => <div key={i} style={{ fontSize: 12, color: C.muted, marginBottom: 5 }}>• {r}</div>)}
            </div>
          )}
        </div>
      )}

      {/* Comparables */}
      {r.comparable_sales?.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Comparable Sales</div>
          {r.comparable_sales.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < r.comparable_sales.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ fontSize: 12, color: C.muted }}>{c.description}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{sym}{c.price?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuthGate() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 58px)', gap: 14 }}>
      <div style={{ fontSize: 52 }}>◇</div>
      <h2 style={{ fontFamily: T.display, fontSize: 22, fontWeight: 900, color: C.text, margin: 0 }}>Sign in for Price AI</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>AI-powered valuations for any property globally</p>
    </div>
  );
}
