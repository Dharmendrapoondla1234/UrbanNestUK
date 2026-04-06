import { useState } from 'react';
import { callGemini, parseJSON } from '../services/gemini.js';
import { COUNTRIES, fmtPrice, AISuggestInput, AIBox, GeminiBadge, Card, SectionTitle } from '../components/ui.jsx';
import { C } from '../utils/design.js';

export default function Predict() {
  const [form, setForm] = useState({ country: 'United Kingdom', city: '', area: '', type: 'Flat', bedrooms: '2', bathrooms: '1', sqft: '', tenure: 'Leasehold', age: '', condition: 'Good', nearbyAmenities: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const ff = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const inputStyle = { background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f2f8', borderRadius: 8, padding: '9px 12px', fontSize: 13, width: '100%', fontFamily: 'inherit' };

  async function getCitySugg(q) {
    const r = await callGemini(`List 8 cities in ${form.country} matching "${q}". Return ONLY JSON array of strings.`, 'Return ONLY JSON array.');
    return await parseJSON(r) || [];
  }

  async function predict() {
    if (!form.city && !form.area) return;
    setLoading(true); setResult(null);
    try {
      const r = await callGemini(
        `Predict accurate market price for this property: ${JSON.stringify(form)}
Return ONLY JSON (no explanation, no markdown):
{"current_value":integer,"range_low":integer,"range_high":integer,"forecast_1yr":float,"forecast_3yr":float,"rental_yield":float,"monthly_rent":integer,"currency_symbol":"correct symbol","confidence":"High|Medium|Low","stamp_duty":integer,"factors":["f1","f2","f3","f4","f5"],"comparables":"brief info","reasoning":"2-3 sentence explanation"}`,
        'Expert property valuation AI with accurate global market knowledge. Return ONLY valid JSON, no markdown fences.'
      );
      setResult(await parseJSON(r));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const c = result?.currency_symbol || '£';

  return (
    <div style={{ padding: 20, maxWidth: 950, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f0f2f8' }}>📈 AI Price Prediction</h1>
        <GeminiBadge />
      </div>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Enter any property details — Gemini AI gives you an accurate valuation and market forecast</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card style={{ padding: 20 }}>
          <SectionTitle>Property Details</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select value={form.country} onChange={e => ff('country', e.target.value)} style={inputStyle}>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <AISuggestInput placeholder="City (required) e.g. London, New York, Sydney" value={form.city} onChange={v => ff('city', v)} fetchSuggestions={getCitySugg} />
            <input value={form.area} onChange={e => ff('area', e.target.value)} placeholder="Area/Neighbourhood e.g. Shoreditch, Notting Hill" style={inputStyle} />
            <select value={form.type} onChange={e => ff('type', e.target.value)} style={inputStyle}>
              {['Flat','Studio','Terraced House','Semi-Detached','Detached House','Bungalow','Penthouse','Commercial','Land'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <input value={form.bedrooms} onChange={e => ff('bedrooms', e.target.value)} placeholder="Beds" type="number" min="0" style={inputStyle} />
              <input value={form.bathrooms} onChange={e => ff('bathrooms', e.target.value)} placeholder="Baths" type="number" min="1" style={inputStyle} />
              <input value={form.sqft} onChange={e => ff('sqft', e.target.value)} placeholder="Sqft" type="number" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select value={form.tenure} onChange={e => ff('tenure', e.target.value)} style={inputStyle}>
                {['Freehold','Leasehold','Share of Freehold'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={form.condition} onChange={e => ff('condition', e.target.value)} style={inputStyle}>
                {['New Build','Excellent','Good','Fair','Needs Renovation'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <input value={form.age} onChange={e => ff('age', e.target.value)} placeholder="Property age e.g. Victorian, 1990s, New build" style={inputStyle} />
            <input value={form.nearbyAmenities} onChange={e => ff('nearbyAmenities', e.target.value)} placeholder="Nearby amenities e.g. tube station, good schools, park" style={inputStyle} />
            <button
              onClick={predict}
              disabled={(!form.city && !form.area) || loading}
              style={{ width: '100%', padding: 12, fontSize: 14, background: 'linear-gradient(135deg,#4285f4,#34a853)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', opacity: (!form.city && !form.area) ? 0.5 : 1 }}
            >
              {loading ? '✦ Gemini Analysing...' : '📈 Predict with Gemini AI'}
            </button>
          </div>
        </Card>

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Card style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Estimated Market Value</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: '#f0f2f8', marginBottom: 4 }}>{fmtPrice(result.current_value, c)}</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{fmtPrice(result.range_low, c)} – {fmtPrice(result.range_high, c)}</div>
              {result.confidence && (
                <span style={{ background: result.confidence === 'High' ? 'rgba(52,168,83,0.2)' : 'rgba(251,188,4,0.2)', color: result.confidence === 'High' ? '#34a853' : '#fbbc04', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                  {result.confidence} Confidence
                </span>
              )}
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                ['1-Yr Forecast', (result.forecast_1yr >= 0 ? '+' : '') + result.forecast_1yr + '%', result.forecast_1yr >= 0 ? '#34a853' : '#ea4335'],
                ['3-Yr Forecast', (result.forecast_3yr >= 0 ? '+' : '') + result.forecast_3yr + '%', result.forecast_3yr >= 0 ? '#34a853' : '#ea4335'],
                ['Rental Yield', result.rental_yield + '%', '#4285f4'],
              ].map(([l, v, col]) => (
                <Card key={l} style={{ padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: col }}>{v}</div>
                </Card>
              ))}
            </div>

            {(result.monthly_rent || result.stamp_duty) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {result.monthly_rent && (
                  <Card style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Est. Monthly Rent</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#34a853' }}>{fmtPrice(result.monthly_rent, c)}/mo</div>
                  </Card>
                )}
                {result.stamp_duty && (
                  <Card style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Est. Stamp Duty</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#fbbc04' }}>{fmtPrice(result.stamp_duty, c)}</div>
                  </Card>
                )}
              </div>
            )}

            {result.factors && (
              <AIBox>
                <SectionTitle>Key Valuation Factors</SectionTitle>
                {result.factors.map((f, i) => <div key={i} style={{ fontSize: 12, color: '#c8d4e8', marginBottom: 3 }}>• {f}</div>)}
              </AIBox>
            )}

            {result.reasoning && (
              <Card style={{ padding: 14 }}>
                <SectionTitle>Gemini Analysis</SectionTitle>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.75 }}>{result.reasoning}</div>
                {result.comparables && <div style={{ fontSize: 11, color: '#4a5568', marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>{result.comparables}</div>}
              </Card>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a5568', textAlign: 'center' }}>
            {loading ? (
              <div>
                <div style={{ width: 32, height: 32, border: '3px solid rgba(66,133,244,0.3)', borderTopColor: '#4285f4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ color: C.muted }}>Analysing market data...</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📈</div>
                <div style={{ fontSize: 13 }}>Enter city & details, then click Predict</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
