import { useState } from 'react';
import { C, T, fmt, btn, UK_CITIES } from '../utils/design.js';
import { getMarketData, getAIMarketInsight } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

const CITY_AREAS = {
  London: ['Canary Wharf', 'Shoreditch', 'Kensington', 'Chelsea', 'Brixton', 'Hackney', 'Islington', 'Clapham', 'Notting Hill', 'Greenwich'],
  Manchester: ['Ancoats', 'Didsbury', 'Salford Quays', 'Chorlton', 'Deansgate', 'Northern Quarter', 'Stretford', 'Hulme'],
  Birmingham: ['Edgbaston', 'Moseley', 'Digbeth', 'Harborne', 'Jewellery Quarter', 'Kings Heath', 'Selly Oak'],
  Leeds: ['Chapel Allerton', 'Headingley', 'Hyde Park', 'Roundhay', 'Horsforth', 'Meanwood', 'Armley'],
  Edinburgh: ['New Town', 'Old Town', 'Leith', 'Morningside', 'Stockbridge', 'Bruntsfield', 'Marchmont'],
  Bristol: ['Clifton', 'Redland', 'Stokes Croft', 'Harbourside', 'Bedminster', 'Cotham', 'Southville'],
  Liverpool: ['Baltic Triangle', 'Anfield', 'Allerton', 'Wavertree', 'Sefton Park', 'Aigburth'],
  Oxford: ['Jericho', 'Cowley', 'Summertown', 'Headington', 'Botley', 'Iffley'],
};

export default function Market() {
  const { user } = useAuth();
  const [city, setCity] = useState('London');
  const [area, setArea] = useState('');
  const [data, setData] = useState(null);
  const [aiInsight, setAiInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  async function analyze() {
    const selectedArea = area || (CITY_AREAS[city]?.[0] || city);
    setLoading(true);
    setData(null);
    setAiInsight('');
    try {
      const r = await getMarketData(city, selectedArea);
      setData(r);
      if (user) {
        setAiLoading(true);
        getAIMarketInsight(city, selectedArea, r)
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

  const selectStyle = {
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.border}`,
    borderRadius: 9, color: C.text,
    fontSize: 13, fontFamily: T.body, outline: 'none',
  };

  function MetricCard({ icon, value, label, color, sub }) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px' }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
        <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 900, color: color || C.text, letterSpacing: '-1px' }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 5 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{sub}</div>}
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: T.display, fontSize: 28, fontWeight: 900, color: C.text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          📊 Market Analysis
        </h1>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Deep market insights for UK property investment decisions</p>
      </div>

      {/* Controls */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: 20,
        display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
        marginBottom: 28,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>City</div>
          <select style={selectStyle} value={city} onChange={e => { setCity(e.target.value); setArea(''); }}>
            {UK_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Area</div>
          <select style={selectStyle} value={area} onChange={e => setArea(e.target.value)}>
            {(CITY_AREAS[city] || []).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          style={{
            ...btn('primary', 'md'),
            background: 'linear-gradient(135deg,#3b8cf8,#8b5cf6)',
            opacity: loading ? 0.6 : 1,
            padding: '10px 24px',
          }}
        >
          {loading ? 'Analysing…' : '📊 Analyse Market'}
        </button>
      </div>

      {data && (
        <>
          {/* Overview */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(59,140,248,0.1),rgba(139,92,246,0.1))',
            border: '1px solid rgba(59,140,248,0.2)',
            borderRadius: 16, padding: 24, marginBottom: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: T.display, fontSize: 22, fontWeight: 900, color: C.text, margin: '0 0 6px' }}>
                  {data.area}, {data.city}
                </h2>
                <p style={{ color: C.muted, fontSize: 14, margin: 0, maxWidth: 600, lineHeight: 1.6 }}>
                  {data.overview}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: C.dim, marginBottom: 4 }}>Investment Rating</div>
                <div style={{ fontFamily: T.display, fontSize: 28, fontWeight: 900, color: C.amber }}>
                  {data.investment_rating?.toFixed(1)}/5
                </div>
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
            <MetricCard icon="💷" value={`£${data.avg_price_sqft?.toLocaleString()}`} label="Avg £/sqft" />
            <MetricCard icon="🏠" value={fmt(data.avg_price)} label="Avg Price" />
            <MetricCard icon="📈" value={`+${data.price_change_1y}%`} label="1yr Growth" color={C.green} />
            <MetricCard icon="📊" value={data.price_trend} label="Price Trend" color={C.blue} />
            <MetricCard icon="🔥" value={data.demand_level} label="Demand" color={data.demand_level === 'High' ? C.green : C.amber} />
            <MetricCard icon="🏗️" value={data.supply_level} label="Supply" />
            <MetricCard icon="💼" value={`${data.rental_yield_avg}%`} label="Rental Yield" color={C.teal} />
            <MetricCard icon="🏘️" value={data.total_listings} label="Active Listings" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Key Drivers */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <h3 style={{ fontFamily: T.display, fontSize: 15, fontWeight: 800, color: C.text, margin: '0 0 16px' }}>📌 Key Market Drivers</h3>
              {data.key_drivers?.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.muted }}>{d.driver}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{d.impact}</span>
                    <span style={{ fontSize: 11, color: C.dim }}>{d.strength}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Risks & Projects */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <h3 style={{ fontFamily: T.display, fontSize: 15, fontWeight: 800, color: C.text, margin: '0 0 12px' }}>⚠️ Risk Factors</h3>
                {data.risks?.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 13, color: C.muted }}>{r.risk}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.severity === 'Low' ? C.green : r.severity === 'High' ? C.red : C.amber }}>{r.severity}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <h3 style={{ fontFamily: T.display, fontSize: 15, fontWeight: 800, color: C.text, margin: '0 0 12px' }}>🚀 Upcoming Projects</h3>
                {data.upcoming_projects?.map((p, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: C.muted }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: C.dim }}>{p.completion}</span>
                    </div>
                    <span style={{ fontSize: 11, color: p.impact === 'High' ? C.green : C.amber }}>{p.impact} impact</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Insight */}
          {(aiLoading || aiInsight) && (
            <div style={{
              marginTop: 20,
              background: 'linear-gradient(135deg,rgba(59,140,248,0.08),rgba(139,92,246,0.08))',
              border: '1px solid rgba(59,140,248,0.2)',
              borderRadius: 14, padding: 20,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>🤖 AI Market Intelligence</div>
              {aiLoading ? (
                <div style={{ fontSize: 13, color: C.muted }}>Generating AI analysis…</div>
              ) : (
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{aiInsight}</div>
              )}
            </div>
          )}
        </>
      )}

      {!data && !loading && (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>📊</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.muted }}>Select a city and area</div>
          <div style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>to get deep market insights and investment analysis</div>
        </div>
      )}
    </div>
  );
}

function AuthGate() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)', gap: 16 }}>
      <div style={{ fontSize: 52 }}>📊</div>
      <h2 style={{ fontFamily: T.display, fontSize: 22, fontWeight: 900, color: C.text, margin: 0 }}>Sign in to access Market Analysis</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Get AI-powered market insights for UK property investment</p>
    </div>
  );
}
