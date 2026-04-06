import { useState, useEffect } from 'react';
import { C, T, fmt, btn, PROPERTY_TYPES } from '../utils/design.js';
import { getMarketAnalysis, generateAreasForCity, GeminiError } from '../services/gemini.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useGlobal } from '../hooks/useGlobal.jsx';

const PROFILES = ['First-time buyer', 'Buy-to-let investor', 'Portfolio investor', 'Commercial investor', 'Overseas buyer', 'Homeowner / Upsizer'];

export default function Market() {
  const { user } = useAuth();
  const { country, city: globalCity, cities } = useGlobal();

  const [form, setForm] = useState({
    city: '', area: '', property_type: '',
    investor_profile: 'First-time buyer', budget: '',
  });
  const [areas, setAreas]           = useState([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [customCity, setCustomCity] = useState('');
  const [customArea, setCustomArea] = useState('');

  // FIX: pre-populate city and load areas from global context on mount
  useEffect(() => {
    if (globalCity) {
      set('city', globalCity);
      loadAreas(globalCity);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

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

  async function analyse() {
    const cityVal = customCity || form.city;
    if (!cityVal) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await getMarketAnalysis({
        ...form,
        city: cityVal,
        area: customArea || form.area,
        country,
      });
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
  const lbl = t => <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 5 }}>{t}</div>;
  const sym = result?.currency_symbol || '£';

  return (
    <div style={{ padding: '24px', maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: T.display, fontSize: 26, fontWeight: 900, color: C.text, margin: '0 0 5px', letterSpacing: '-0.5px' }}>△ Market Intelligence</h1>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>AI-generated market analysis for any location globally — demand, supply, growth, risks, and investment verdict</p>
      </div>

      {/* Controls */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            {lbl('City')}
            <div style={{ display: 'flex', gap: 6 }}>
              <select style={{ ...sel, flex: 1, minWidth: 0 }} value={form.city} onChange={e => handleCityChange(e.target.value)}>
                <option value="">Select…</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input style={{ ...sel, width: 100, flex: '0 0 100px' }} placeholder="Or type…" value={customCity} onChange={e => setCustomCity(e.target.value)} />
            </div>
          </div>

          <div>
            {lbl('Area')}
            <div style={{ display: 'flex', gap: 6 }}>
              <select style={{ ...sel, flex: 1, minWidth: 0 }} value={form.area} onChange={e => set('area', e.target.value)} disabled={areasLoading}>
                <option value="">{areasLoading ? 'Loading…' : 'Any area'}</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <input style={{ ...sel, width: 100, flex: '0 0 100px' }} placeholder="Or type…" value={customArea} onChange={e => setCustomArea(e.target.value)} />
            </div>
          </div>

          <div>
            {lbl('Property Focus')}
            <select style={sel} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
              <option value="">All Types</option>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            {lbl('Investor Profile')}
            <select style={sel} value={form.investor_profile} onChange={e => set('investor_profile', e.target.value)}>
              {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            {lbl('Budget Range')}
            <input style={sel} placeholder="e.g. £200k–£500k" value={form.budget} onChange={e => set('budget', e.target.value)} />
          </div>

          <button
            onClick={analyse}
            disabled={loading || (!form.city && !customCity)}
            style={{ ...btn('primary', 'lg'), width: '100%', justifyContent: 'center', opacity: loading || (!form.city && !customCity) ? 0.6 : 1 }}
          >
            {loading ? '⏳ Analysing…' : '△ Run Analysis'}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 9 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.red }}>{error.code?.replace(/_/g,' ')} — {error.message}</div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 14, animation: 'spin 2s linear infinite', display: 'inline-block' }}>△</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>AI analysing {customCity || form.city} market…</div>
          <div style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>Gathering demand, supply, price trends, risks…</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Results */}
      {result && !loading && <MarketResults r={result} sym={sym} city={customCity || form.city} area={customArea || form.area} />}

      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>△</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.muted, fontFamily: T.display }}>Select a city to begin</div>
          <div style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>AI will generate comprehensive market intelligence for any global location</div>
        </div>
      )}
    </div>
  );
}

function MarketResults({ r, sym, city, area }) {
  const phaseColor = { 'Boom': C.green, 'Growth': C.teal, 'Stable': C.blue, 'Correction': C.amber, 'Recovery': C.purple }[r.market_phase] || C.muted;
  const demandColor = { 'Very High': C.green, 'High': C.teal, 'Moderate': C.blue, 'Low': C.amber }[r.demand_level] || C.muted;

  return (
    <div>
      {/* Overview hero */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(79,158,255,0.09),rgba(129,140,248,0.09))',
        border: '1px solid rgba(79,158,255,0.2)', borderRadius: 16, padding: 24, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 900, color: C.text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              {area ? `${area}, ` : ''}{city}
            </div>
            <p style={{ color: C.muted, fontSize: 14, margin: 0, lineHeight: 1.65, maxWidth: 600 }}>{r.market_summary}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 5 }}>Investment Score</div>
            <div style={{ fontFamily: T.display, fontSize: 36, fontWeight: 900, color: C.amber, letterSpacing: '-1px' }}>{r.investment_score}<span style={{ fontSize: 16 }}>/10</span></div>
            <div style={{ fontSize: 11, color: phaseColor, fontWeight: 700, marginTop: 4 }}>{r.market_phase}</div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '💷', label: 'Avg Price', value: `${sym}${r.avg_price?.toLocaleString()}` },
          { icon: '📐', label: 'Avg £/sqft', value: `${sym}${r.avg_price_sqft?.toLocaleString()}` },
          { icon: '📈', label: '1yr Growth', value: `+${r.price_change_1y_pct}%`, color: C.green },
          { icon: '📊', label: '5yr Growth', value: `+${r.price_change_5y_pct}%`, color: C.teal },
          { icon: '💼', label: 'Rental Yield', value: `${r.avg_rental_yield}%`, color: C.cyan },
          { icon: '🔥', label: 'Demand', value: r.demand_level, color: demandColor },
          { icon: '🏗', label: 'Supply', value: r.supply_level },
          { icon: '📉', label: 'Price 5yr Forecast', value: `+${r.price_forecast?.['5yr']}%`, color: C.purple },
        ].map(m => (
          <div key={m.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 15px' }}>
            <div style={{ fontSize: 18, marginBottom: 7 }}>{m.icon}</div>
            <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 900, color: m.color || C.text, letterSpacing: '-0.3px' }}>{m.value || '—'}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* 3-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Drivers */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Market Drivers</div>
          {r.key_drivers?.map((d, i) => (
            <div key={i} style={{ padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>{d.driver}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: d.impact === 'Positive' ? C.green : C.red, marginLeft: 8 }}>{d.impact}</span>
              </div>
              <span style={{ fontSize: 10, color: C.dim }}>{d.magnitude} impact</span>
            </div>
          ))}
        </div>

        {/* Risks */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Risk Factors</div>
          {r.risks?.map((risk, i) => (
            <div key={i} style={{ padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>{risk.risk}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: risk.severity === 'Low' ? C.green : risk.severity === 'High' ? C.red : C.amber }}>{risk.severity}</span>
              </div>
              <span style={{ fontSize: 10, color: C.dim }}>{risk.timeline}</span>
            </div>
          ))}
        </div>

        {/* Developments */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Upcoming Projects</div>
          {r.upcoming_developments?.map((d, i) => (
            <div key={i} style={{ padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>{d.project}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: C.teal }}>{d.impact}</span>
                <span style={{ fontSize: 10, color: C.dim }}>{d.year}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top growth areas */}
      {r.top_growth_areas?.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Top Growth Areas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {r.top_growth_areas.map((a, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{a.area}</div>
                <div style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>+{a.growth_pct}% forecast</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{a.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advice */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {r.buyer_advice && (
          <div style={{ background: 'rgba(79,158,255,0.07)', border: '1px solid rgba(79,158,255,0.18)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 9 }}>Buyer Advice</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{r.buyer_advice}</div>
          </div>
        )}
        {r.investor_verdict && (
          <div style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 9 }}>Investment Verdict</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{r.investor_verdict}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthGate() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 58px)', gap: 14 }}>
      <div style={{ fontSize: 52 }}>△</div>
      <h2 style={{ fontFamily: T.display, fontSize: 22, fontWeight: 900, color: C.text, margin: 0 }}>Sign in for Market Intelligence</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>AI-powered market analysis for any city globally</p>
    </div>
  );
}
