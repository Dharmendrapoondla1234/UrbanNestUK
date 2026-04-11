/**
 * UrbanNest AI — Market Intelligence Page
 * AI-generated market analysis for any city/area.
 */
import { useState, useEffect } from 'react';
import { marketIntelligence } from '../services/api.js';
import { useGlobal } from '../hooks/useGlobal.jsx';

const PROFILES = [
  'First-time buyer', 'Buy-to-let investor', 'Portfolio investor',
  'Commercial investor', 'Overseas buyer', 'Homeowner / Upsizer',
];

export default function Market() {
  const { country, city: globalCity, cities, propTypes } = useGlobal();

  const [form, setForm]       = useState({ city: '', area: '', property_type: '', profile: 'First-time buyer' });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (globalCity) setForm(f => ({ ...f, city: globalCity }));
  }, [globalCity]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function analyse() {
    if (!form.city) { setError('Please select a city.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await marketIntelligence({
        country, city: form.city, area: form.area || undefined,
        profile: form.profile,
      });
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const sel = {
    padding: '9px 11px', borderRadius: 8, border: '1px solid #E5E7EB',
    fontSize: 13, background: '#F9FAFB', outline: 'none', width: '100%',
  };
  const lbl = t => (
    <label style={{ fontSize: 10, fontWeight: 700, color: '#6B7280',
      display: 'block', marginBottom: 4, letterSpacing: '0.5px' }}>{t}</label>
  );
  const sym = result?.currency_symbol || (country === 'india' ? '₹' : '£');

  return (
    <div style={{ padding: '24px', maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 5px', fontSize: 26, fontWeight: 900, color: '#0F172A' }}>
          △ Market Intelligence
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
          AI-generated market analysis — demand, supply, growth, risks, and investment verdict
        </p>
      </div>

      {/* Controls */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 13, padding: 20, marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            {lbl('CITY')}
            <select style={sel} value={form.city} onChange={e => set('city', e.target.value)}>
              <option value="">Select city…</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            {lbl('AREA (OPTIONAL)')}
            <input style={sel} placeholder="e.g. Whitefield, Shoreditch"
              value={form.area} onChange={e => set('area', e.target.value)} />
          </div>
          <div>
            {lbl('PROPERTY FOCUS')}
            <select style={sel} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
              <option value="">All Types</option>
              {propTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            {lbl('INVESTOR PROFILE')}
            <select style={sel} value={form.profile} onChange={e => set('profile', e.target.value)}>
              {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <button
              onClick={analyse}
              disabled={loading || !form.city}
              style={{
                width: '100%', padding: '10px', borderRadius: 9,
                background: '#1B4FD8', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                opacity: (loading || !form.city) ? 0.55 : 1,
              }}
            >
              {loading ? '⏳ Analysing…' : '△ Run Analysis'}
            </button>
          </div>
        </div>
        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#FEF2F2',
            border: '1px solid #FECACA', borderRadius: 8, color: '#991B1B', fontSize: 12 }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 14, display: 'inline-block',
            animation: 'spin 2s linear infinite' }}>△</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#6B7280' }}>
            Analysing {form.city} market…
          </div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>
            Gathering demand, supply, price trends, risks…
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 52, marginBottom: 14, color: '#E5E7EB' }}>△</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#6B7280' }}>Select a city to begin</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>
            AI will generate comprehensive market intelligence for any location
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && <MarketResults r={result} sym={sym} city={form.city} area={form.area} />}
    </div>
  );
}

function MarketResults({ r, sym, city, area }) {
  const phaseColor = { Boom: '#059669', Growth: '#0D9488', Stable: '#1B4FD8', Correction: '#D97706', Recovery: '#7C3AED' }[r.market_phase] || '#6B7280';
  const demandColor = { 'Very High': '#059669', High: '#0D9488', Moderate: '#1B4FD8', Low: '#D97706' }[r.demand_level] || '#6B7280';
  const fmtN = n => n != null ? Number(n).toLocaleString() : '—';

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(27,79,216,0.08),rgba(124,58,237,0.08))',
        border: '1px solid rgba(27,79,216,0.18)', borderRadius: 14, padding: 24, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', marginBottom: 6 }}>
              {area ? `${area}, ` : ''}{city}
            </div>
            <p style={{ color: '#374151', fontSize: 14, margin: 0, lineHeight: 1.65, maxWidth: 560 }}>
              {r.market_summary}
            </p>
          </div>
          <div style={{ textAlign: 'center', minWidth: 100 }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 5 }}>Investment Score</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#D97706', letterSpacing: '-1px' }}>
              {r.investment_score}<span style={{ fontSize: 15 }}>/10</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: phaseColor, marginTop: 4 }}>{r.market_phase}</div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '💷', label: 'Avg Price',     value: `${sym}${fmtN(r.avg_price)}` },
          { icon: '📈', label: '1yr Growth',    value: r.price_change_1y_pct != null ? `+${r.price_change_1y_pct}%` : '—', color: '#059669' },
          { icon: '📊', label: '5yr Growth',    value: r.price_change_5y_pct != null ? `+${r.price_change_5y_pct}%` : '—', color: '#0D9488' },
          { icon: '💼', label: 'Rental Yield',  value: r.avg_rental_yield != null ? `${r.avg_rental_yield}%` : '—', color: '#0D9488' },
          { icon: '🔥', label: 'Demand',        value: r.demand_level || '—', color: demandColor },
          { icon: '🏗',  label: 'Supply',        value: r.supply_level || '—' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 11, padding: '13px 14px' }}>
            <div style={{ fontSize: 18, marginBottom: 7 }}>{m.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: m.color || '#0F172A' }}>{m.value}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* 3-col: Drivers / Risks / Developments */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        {[
          { title: 'Market Drivers', color: '#374151', items: (r.key_drivers || []).map(d => ({ name: d.driver, badge: d.impact, badgeColor: d.impact === 'Positive' ? '#059669' : '#DC2626', sub: d.magnitude })) },
          { title: 'Risk Factors',   color: '#374151', items: (r.risks || []).map(d => ({ name: d.risk, badge: d.severity, badgeColor: d.severity === 'Low' ? '#059669' : d.severity === 'High' ? '#DC2626' : '#D97706', sub: d.timeline })) },
        ].map(section => (
          <div key={section.title} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 17 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase',
              letterSpacing: '0.7px', marginBottom: 12 }}>{section.title}</div>
            {section.items.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>No data</div>
            ) : section.items.map((item, i) => (
              <div key={i} style={{ padding: '7px 0', borderBottom: i < section.items.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, color: '#374151', flex: 1, paddingRight: 8 }}>{item.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: item.badgeColor, flexShrink: 0 }}>{item.badge}</span>
                </div>
                {item.sub && <span style={{ fontSize: 10, color: '#9CA3AF' }}>{item.sub}</span>}
              </div>
            ))}
          </div>
        ))}

        {/* Top growth areas */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 17 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase',
            letterSpacing: '0.7px', marginBottom: 12 }}>Top Growth Areas</div>
          {(r.top_growth_areas || []).length === 0 ? (
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>No data</div>
          ) : (r.top_growth_areas || []).map((a, i) => (
            <div key={i} style={{ padding: '7px 0', borderBottom: i < r.top_growth_areas.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{a.area}</div>
              <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>+{a.growth_pct}% forecast</div>
            </div>
          ))}
        </div>
      </div>

      {/* Advice */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {r.buyer_advice && (
          <div style={{ background: 'rgba(27,79,216,0.05)', border: '1px solid rgba(27,79,216,0.15)', borderRadius: 12, padding: 17 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1B4FD8', textTransform: 'uppercase',
              letterSpacing: '0.7px', marginBottom: 8 }}>Buyer Advice</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.65 }}>{r.buyer_advice}</div>
          </div>
        )}
        {r.investor_verdict && (
          <div style={{ background: 'rgba(5,150,105,0.05)', border: '1px solid rgba(5,150,105,0.15)', borderRadius: 12, padding: 17 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase',
              letterSpacing: '0.7px', marginBottom: 8 }}>Investment Verdict</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.65 }}>{r.investor_verdict}</div>
          </div>
        )}
      </div>
    </div>
  );
}
