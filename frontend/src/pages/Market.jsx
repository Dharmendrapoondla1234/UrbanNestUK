import { useState } from 'react';
import { callGemini, parseJSON } from '../services/gemini.js';
import { COUNTRIES, fmtPrice, AISuggestInput, AIBox, GeminiBadge, Card, SectionTitle } from '../components/ui.jsx';
import { C } from '../utils/design.js';

export default function Market() {
  const [country, setCountry] = useState('United Kingdom');
  const [city, setCity] = useState('');
  const [propType, setPropType] = useState('');
  const [timeframe, setTimeframe] = useState('2025');
  const [query, setQuery] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const inputStyle = { background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f2f8', borderRadius: 8, padding: '9px 12px', fontSize: 13, width: '100%', fontFamily: 'inherit' };

  async function getCitySugg(q) {
    const r = await callGemini(`List 7 real cities in ${country} matching "${q}". Return ONLY JSON array of strings.`, 'Return ONLY JSON array.');
    return await parseJSON(r) || [];
  }

  async function analyse() {
    setLoading(true); setReport(null);
    try {
      const r = await callGemini(
        `Generate comprehensive property market analysis:
Country: ${country}, City: ${city || 'national overview'}, Property type: ${propType || 'all residential'}, Timeframe: ${timeframe}, Focus: ${query || 'general market overview'}

Return ONLY valid JSON (no markdown):
{"summary":"2-3 sentence overview","avg_price":number,"price_change_yoy":float,"avg_yield":float,"demand_score":int,"supply_score":int,"investment_score":int,"currency_symbol":"correct","transaction_volume_change":float,"avg_days_on_market":int,"top_areas":[{"area":"","avg_price":number,"change":float,"hotness":"Hot|Warm|Cool","reason":""}],"market_drivers":["4 items"],"risks":["3 items"],"opportunities":["3 items"],"forecast":"12-month outlook","buyer_advice":"specific advice","investor_advice":"specific advice","first_timer_advice":"advice for first-time buyers"}`,
        'Expert property market analyst with global real estate data. Return ONLY valid JSON, no markdown fences.'
      );
      setReport(await parseJSON(r));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const c = report?.currency_symbol || '£';

  return (
    <div style={{ padding: 20, maxWidth: 1050, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f0f2f8' }}>📊 Market Analysis</h1>
        <GeminiBadge />
      </div>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Enter any market — Gemini AI generates deep property market intelligence</p>

      <Card style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 10 }}>
          <select value={country} onChange={e => setCountry(e.target.value)} style={inputStyle}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <AISuggestInput placeholder="City (optional)" value={city} onChange={setCity} fetchSuggestions={getCitySugg} />
          <select value={propType} onChange={e => setPropType(e.target.value)} style={inputStyle}>
            <option value="">All types</option>
            {['Residential','Flat/Apartment','House','Luxury','Commercial','Buy-to-Let','New Build'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={timeframe} onChange={e => setTimeframe(e.target.value)} placeholder="Timeframe e.g. 2025, Q2 2025" style={inputStyle} />
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder='Focus: e.g. "buy-to-let investment potential", "first-time buyer affordability", "new build demand"...' style={{ ...inputStyle, marginBottom: 10 }} />
        <button
          onClick={analyse}
          style={{ width: '100%', padding: 12, fontSize: 14, background: 'linear-gradient(135deg,#4285f4,#34a853)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
        >
          {loading ? '✦ Gemini Analysing...' : '📊 Generate Market Report'}
        </button>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(66,133,244,0.3)', borderTopColor: '#4285f4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: C.muted }}>Gemini AI is generating market intelligence...</div>
        </div>
      )}

      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AIBox>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <GeminiBadge />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4285f4' }}>Market Overview — {country}{city ? ' · ' + city : ''}</span>
            </div>
            <div style={{ fontSize: 13, color: '#c8d4e8', lineHeight: 1.75 }}>{report.summary}</div>
          </AIBox>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 9 }}>
            {[
              ['Avg Price', fmtPrice(report.avg_price, c), '#f0f2f8'],
              ['YoY Change', (report.price_change_yoy >= 0 ? '+' : '') + report.price_change_yoy + '%', report.price_change_yoy >= 0 ? '#34a853' : '#ea4335'],
              ['Avg Yield', report.avg_yield + '%', '#4285f4'],
              ['Demand', report.demand_score + '/10', '#8b5cf6'],
              ['Supply', report.supply_score + '/10', '#fbbc04'],
              ['Investment', report.investment_score + '/10', '#34a853'],
              report.avg_days_on_market ? ['Days on Market', report.avg_days_on_market + 'd', C.muted] : null,
              report.transaction_volume_change ? ['Vol Change', (report.transaction_volume_change >= 0 ? '+' : '') + report.transaction_volume_change + '%', report.transaction_volume_change >= 0 ? '#34a853' : '#ea4335'] : null,
            ].filter(Boolean).map(([l, v, col]) => (
              <Card key={l} style={{ padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: col }}>{v}</div>
              </Card>
            ))}
          </div>

          {report.top_areas?.length > 0 && (
            <Card style={{ padding: 16 }}>
              <SectionTitle>Top Performing Areas</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 9 }}>
                {report.top_areas.map((a, i) => (
                  <div key={i} style={{ background: '#1a1d26', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f2f8' }}>{a.area}</div>
                      {a.hotness && <span style={{ background: a.hotness === 'Hot' ? 'rgba(234,67,53,0.15)' : 'rgba(66,133,244,0.12)', color: a.hotness === 'Hot' ? '#ea4335' : '#4285f4', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{a.hotness}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#4285f4', marginBottom: 2 }}>{fmtPrice(a.avg_price, c)}</div>
                    <div style={{ fontSize: 11, color: a.change >= 0 ? '#34a853' : '#ea4335', marginBottom: 3 }}>{a.change >= 0 ? '▲' : '▼'} {Math.abs(a.change)}% YoY</div>
                    <div style={{ fontSize: 11, color: '#4a5568' }}>{a.reason}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[['🚀 Market Drivers', '#34a853', report.market_drivers], ['⚠ Risks', '#ea4335', report.risks], ['💡 Opportunities', '#4285f4', report.opportunities]].map(([title, col, items]) => (
              <Card key={title} style={{ padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: col, marginBottom: 8 }}>{title}</div>
                {(items || []).map((item, i) => <div key={i} style={{ fontSize: 12, color: C.muted, marginBottom: 4, lineHeight: 1.5 }}>• {item}</div>)}
              </Card>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[['🏠 Buyer Advice', report.buyer_advice], ['💼 Investor Advice', report.investor_advice], ['🔑 First-Timer', report.first_timer_advice]].map(([t, txt]) => (
              <Card key={t} style={{ padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4285f4', marginBottom: 6 }}>{t}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{txt || '—'}</div>
              </Card>
            ))}
          </div>

          {report.forecast && (
            <AIBox>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', marginBottom: 6 }}>🔮 12-Month Outlook</div>
              <div style={{ fontSize: 13, color: '#c8d4e8', lineHeight: 1.7 }}>{report.forecast}</div>
            </AIBox>
          )}
        </div>
      )}
    </div>
  );
}
