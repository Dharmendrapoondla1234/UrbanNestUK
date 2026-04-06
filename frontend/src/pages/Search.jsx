import { useState } from 'react';
import { callGemini, parseJSON } from '../services/gemini.js';
import { COUNTRIES, fmtPrice, AISuggestInput, AIBox, GeminiBadge, Card, PROP_IMGS } from '../components/ui.jsx';
import PropertyCard from '../components/property/PropertyCard.jsx';
import PropertyDetail from '../components/property/PropertyDetail.jsx';
import { C } from '../utils/design.js';

export default function Search({ initialParams = {} }) {
  const [country, setCountry] = useState(initialParams.country || 'United Kingdom');
  const [city, setCity] = useState(initialParams.city || '');
  const [query, setQuery] = useState(initialParams.query || '');
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', beds: '', type: '' });
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [searched, setSearched] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const ff = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  async function getCitySugg(q) {
    const r = await callGemini(`List 8 real cities or neighbourhoods in ${country} that match "${q}". Return ONLY a JSON array of strings.`, 'Return ONLY a JSON array of city name strings.');
    return await parseJSON(r) || [];
  }

  async function getQuerySugg(q) {
    const r = await callGemini(`Suggest 7 specific property search queries for "${q}" in ${country}${city ? ' ' + city : ''}. Return ONLY a JSON array of strings.`, 'Return ONLY a JSON array of search query strings.');
    return await parseJSON(r) || [];
  }

  async function search() {
    setLoading(true); setProperties([]); setAiSummary(''); setSearched(true);
    try {
      const imgPool = PROP_IMGS.join('","');
      const prompt = `Generate 8 realistic, accurate property listings matching this search:
- Country: ${country}
- City/Area: ${city || 'any major city'}
- Search query: ${query || 'residential properties for sale'}
- Min price: ${filters.minPrice || 'none'}, Max price: ${filters.maxPrice || 'none'}
- Min bedrooms: ${filters.beds || 'any'}, Property type: ${filters.type || 'any'}

Return ONLY a JSON array. Each property must have:
id (integer), title, address, city, country, currency_symbol (correct for ${country}), type, bedrooms (int), bathrooms (int), price (realistic int in local currency), price_per_sqft (int), area_sqft (int), area (neighbourhood), tenure, epc_rating, council_tax_band, nearest_station, station_distance, availability, rating (3.5-5.0), amenities (array), estate_agent, verified (bool), images (pick 2 from ["${imgPool}"])

Use ACCURATE local market prices for ${country}. Return ONLY valid JSON array.`;

      const r = await callGemini(prompt, 'Property data expert with accurate global real estate knowledge. Return ONLY valid JSON array.', 2000);
      const props = await parseJSON(r);
      if (props && props.length) {
        setProperties(props);
        const sum = await callGemini(
          `In 1-2 sentences, summarise why these ${props.length} properties match "${query || city}" in ${country}. Mention price range and key features.`,
          'Brief and helpful. Max 2 sentences.', 200
        );
        setAiSummary(sum);
      }
    } catch (e) { console.error('Search error:', e); }
    setLoading(false);
  }

  const inputStyle = { background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f2f8', borderRadius: 8, padding: '9px 12px', fontSize: 13, width: '100%', fontFamily: 'inherit' };
  const selectStyle = { ...inputStyle };

  return (
    <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
          <h1 style={{ fontSize: 23, fontWeight: 900, color: '#f0f2f8' }}>🔍 Global Property Search</h1>
          <GeminiBadge />
        </div>
        <p style={{ color: C.muted, fontSize: 13 }}>AI-powered search across 15+ countries with high-accuracy results</p>
      </div>

      <Card style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 10, marginBottom: 10 }}>
          <select value={country} onChange={e => { setCountry(e.target.value); setCity(''); }} style={selectStyle}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <AISuggestInput placeholder="City or area..." value={city} onChange={setCity} fetchSuggestions={getCitySugg} />
        </div>

        <AISuggestInput
          placeholder='What are you looking for? e.g. "2 bed flat near station", "family home with garden", "investment property high yield"...'
          value={query} onChange={setQuery} fetchSuggestions={getQuerySugg}
          style={{ marginBottom: 10 }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
          <input placeholder="Min price" value={filters.minPrice} onChange={e => ff('minPrice', e.target.value)} style={inputStyle} />
          <input placeholder="Max price" value={filters.maxPrice} onChange={e => ff('maxPrice', e.target.value)} style={inputStyle} />
          <input placeholder="Min beds" type="number" min="0" value={filters.beds} onChange={e => ff('beds', e.target.value)} style={inputStyle} />
          <select value={filters.type} onChange={e => ff('type', e.target.value)} style={selectStyle}>
            <option value="">All types</option>
            {['Flat','Studio','Terraced House','Semi-Detached','Detached House','Bungalow','Penthouse','Commercial','Land'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button
          onClick={search}
          style={{ width: '100%', padding: 12, fontSize: 14, background: 'linear-gradient(135deg,#4285f4,#34a853)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
        >
          {loading ? '✦ Gemini is searching...' : '🔍 Search Properties with Gemini AI'}
        </button>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(66,133,244,0.3)', borderTopColor: '#4285f4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
          <div style={{ color: C.muted }}>Gemini AI is finding the best matches...</div>
        </div>
      )}

      {aiSummary && (
        <AIBox style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <GeminiBadge text="✦" />
          <span style={{ fontSize: 13, color: '#c8d4e8', lineHeight: 1.7 }}>{aiSummary}</span>
        </AIBox>
      )}

      {properties.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{properties.length} properties found</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 14 }}>
            {properties.map(p => <PropertyCard key={p.id || Math.random()} p={p} onClick={() => setSelected(p)} />)}
          </div>
        </div>
      )}

      {searched && !loading && properties.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏠</div>
          <div>No results found. Try a different search.</div>
        </div>
      )}

      {selected && <PropertyDetail property={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
