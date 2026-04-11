/**
 * UrbanNest AI — Price AI (Valuation) Page
 * AI-powered property valuation for India & UK.
 */
import { useState, useEffect } from 'react';
import { aiValuation } from '../services/api.js';
import { useGlobal } from '../hooks/useGlobal.jsx';

const CONDITIONS = ['New Build', 'Excellent', 'Good', 'Fair', 'Needs Work'];
const PARKING    = ['None', 'On-street', 'Allocated Space', 'Garage', 'Double Garage'];

export default function Predict() {
  const { country, city: globalCity, cities, propTypes, symbol } = useGlobal();

  const [form, setForm] = useState({
    city: '', area: '', property_type: '', size_sqft: '',
    bedrooms: '', condition: 'Good',
  });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (globalCity) setForm(f => ({ ...f, city: globalCity }));
  }, [globalCity]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function runValuation() {
    if (!form.city || !form.property_type) {
      setError('Please select a city and property type.');
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await aiValuation({ ...form, country });
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const inp = {
    width: '100%', padding: '9px 11px', boxSizing: 'border-box',
    border: '1px solid #E5E7EB', borderRadius: 8,
    fontSize: 13, background: '#F9FAFB', outline: 'none',
  };
  const lbl = t => (
    <label style={{ fontSize: 10, fontWeight: 700, color: '#6B7280',
      display: 'block', marginBottom: 4, letterSpacing: '0.5px' }}>{t}</label>
  );
  const sym = result?.currency === 'INR' ? '₹' : '£';

  return (
    <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 5px', fontSize: 26, fontWeight: 900, color: '#0F172A' }}>
          ◇ AI Price Valuation
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
          Enter any property details — AI generates a live valuation with investment analysis
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* ── Form ── */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>
            Property Parameters
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              {lbl('CITY')}
              <select style={inp} value={form.city} onChange={e => set('city', e.target.value)}>
                <option value="">Select city…</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              {lbl('AREA / NEIGHBOURHOOD')}
              <input style={inp} placeholder="e.g. Whitefield, Shoreditch…"
                value={form.area} onChange={e => set('area', e.target.value)} />
            </div>
            <div>
              {lbl('PROPERTY TYPE')}
              <select style={inp} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                <option value="">Select type…</option>
                {propTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                {lbl('SIZE (SQFT)')}
                <input type="number" style={inp} placeholder="e.g. 850"
                  value={form.size_sqft} onChange={e => set('size_sqft', e.target.value)} />
              </div>
              <div>
                {lbl('BEDROOMS')}
                <select style={inp} value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)}>
                  <option value="">N/A</option>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div>
              {lbl('CONDITION')}
              <select style={inp} value={form.condition} onChange={e => set('condition', e.target.value)}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: '#FEF2F2',
                border: '1px solid #FECACA', borderRadius: 8, color: '#991B1B', fontSize: 12 }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={runValuation}
              disabled={loading || !form.city || !form.property_type}
              style={{
                padding: '11px', borderRadius: 9, background: '#1B4FD8',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, marginTop: 4,
                opacity: (loading || !form.city || !form.property_type) ? 0.55 : 1,
              }}
            >
              {loading ? '⏳ AI Valuing Property…' : '🔮 Generate Valuation'}
            </button>
          </div>
        </div>

        {/* ── Results ── */}
        <div>
          {!result ? (
            <div style={{
              background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14,
              padding: 40, textAlign: 'center',
            }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>◇</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#6B7280' }}>AI Valuation Ready</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6, maxWidth: 220, margin: '6px auto 0' }}>
                Fill in the property details and click Generate Valuation
              </div>
            </div>
          ) : (
            <ValuationResult r={result} sym={sym} />
          )}
        </div>
      </div>
    </div>
  );
}

function ValuationResult({ r, sym }) {
  const ratingColor = { Excellent: '#059669', Good: '#1B4FD8', Moderate: '#D97706', 'Below Average': '#DC2626' }[r.investment_rating] || '#6B7280';
  const sentColor   = { Rising: '#059669', Stable: '#1B4FD8', Cooling: '#D97706' }[r.market_sentiment] || '#6B7280';
  const fmtN = (n) => n != null ? Number(n).toLocaleString() : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Main price */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(27,79,216,0.08),rgba(124,58,237,0.08))',
        border: '1px solid rgba(27,79,216,0.2)', borderRadius: 14, padding: 22, textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1B4FD8', textTransform: 'uppercase',
          letterSpacing: '0.8px', marginBottom: 8 }}>AI Estimated Value</div>
        <div style={{ fontSize: 42, fontWeight: 900, color: '#0F172A', letterSpacing: '-1.5px', lineHeight: 1 }}>
          {r.price_display || `${sym}${fmtN(r.estimated_price)}`}
        </div>
        {r.price_range_low && r.price_range_high && (
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            Range: {sym}{fmtN(r.price_range_low)} – {sym}{fmtN(r.price_range_high)}
          </div>
        )}
        {r.confidence_pct && (
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
            Confidence: {r.confidence_pct}%
          </div>
        )}
      </div>

      {/* Metric grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: '📈', label: 'Rental Yield',   value: r.gross_rental_yield   != null ? `${r.gross_rental_yield}%` : '—',           color: '#059669' },
          { icon: '🏠', label: 'Monthly Rent',   value: r.estimated_monthly_rent != null ? `${sym}${fmtN(r.estimated_monthly_rent)}` : '—', color: '#0F172A' },
          { icon: '📊', label: 'Annual Growth',  value: r.annual_growth_pct    != null ? `+${r.annual_growth_pct}%` : '—',           color: '#059669' },
          { icon: '⚖️', label: 'Investment',     value: r.investment_rating    || '—',                                                  color: ratingColor },
          { icon: '📉', label: 'Market',         value: r.market_sentiment     || '—',                                                  color: sentColor },
          { icon: '💷', label: 'Per sqft',       value: r.price_per_sqft       != null ? `${sym}${fmtN(r.price_per_sqft)}` : '—',    color: '#D97706' },
        ].map(m => (
          <div key={m.label} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '13px 14px' }}>
            <div style={{ fontSize: 18, marginBottom: 5 }}>{m.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* AI analysis */}
      {r.ai_analysis && (
        <div style={{
          background: 'rgba(27,79,216,0.05)', border: '1px solid rgba(27,79,216,0.15)',
          borderRadius: 10, padding: 14,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1B4FD8', textTransform: 'uppercase',
            letterSpacing: '0.7px', marginBottom: 7 }}>🤖 AI Analysis</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.65 }}>{r.ai_analysis}</div>
        </div>
      )}

      {/* Drivers & Risks */}
      {((r.key_drivers?.length > 0) || (r.risk_factors?.length > 0)) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {r.key_drivers?.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase',
                letterSpacing: '0.6px', marginBottom: 8 }}>✓ Value Drivers</div>
              {r.key_drivers.map((d, i) => (
                <div key={i} style={{ fontSize: 12, color: '#374151', marginBottom: 5 }}>• {d}</div>
              ))}
            </div>
          )}
          {r.risk_factors?.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', textTransform: 'uppercase',
                letterSpacing: '0.6px', marginBottom: 8 }}>⚠ Risk Factors</div>
              {r.risk_factors.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: '#374151', marginBottom: 5 }}>• {r}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
