import { useState, useRef, useEffect } from 'react';
import { C, T, btn, inputStyle, PROPERTY_TYPES, SORT_OPTIONS } from '../../utils/design.js';
import { parseSearchIntent, getSearchSuggestions } from '../../services/gemini.js';
import { useGlobal } from '../../hooks/useGlobal.jsx';

export default function SearchPanel({ onSearch, initialParams = {}, compact = false }) {
  const { country, city: globalCity } = useGlobal();
  const [query, setQuery]         = useState(initialParams.query || '');
  const [city, setCity]           = useState(initialParams.city || globalCity || '');
  const [type, setType]           = useState(initialParams.type || '');
  const [minPrice, setMinPrice]   = useState(initialParams.min_price || '');
  const [maxPrice, setMaxPrice]   = useState(initialParams.max_price || '');
  const [bedrooms, setBedrooms]   = useState(initialParams.bedrooms || '');
  const [furnishing, setFurnishing] = useState(initialParams.furnishing || '');
  const [sort, setSort]           = useState(initialParams.sort || 'featured');
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading]   = useState(false);
  const [showSug, setShowSug]         = useState(false);
  const [parsing, setParsing]         = useState(false);
  const debounceRef = useRef(null);

  // AI Suggestions debounced
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSugLoading(true);
      const sug = await getSearchSuggestions(query, country, city);
      setSuggestions(sug);
      setSugLoading(false);
    }, 500);
  }, [query, country, city]);

  async function handleNLSearch() {
    if (!query.trim()) return;
    setParsing(true);
    const parsed = await parseSearchIntent(query, { country, city });
    setParsing(false);
    const params = {
      query: parsed.refined_query || query,
      city: parsed.city || city,
      type: parsed.type || type,
      min_price: parsed.min_price || minPrice,
      max_price: parsed.max_price || maxPrice,
      bedrooms: parsed.bedrooms || bedrooms,
      sort,
    };
    onSearch(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)));
  }

  function handleSearch() {
    const params = { query, city, type, min_price: minPrice, max_price: maxPrice, bedrooms, furnishing, sort };
    onSearch(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)));
  }

  const sel = {
    ...inputStyle(),
    padding: '9px 11px', fontSize: 13,
  };

  const lbl = text => (
    <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 5 }}>{text}</div>
  );

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
      {/* Natural language search */}
      <div style={{ marginBottom: 14, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              style={{ ...inputStyle(), paddingLeft: 38 }}
              placeholder="Describe what you're looking for… e.g. '3 bed flat in Shoreditch under £600k'"
              value={query}
              onChange={e => { setQuery(e.target.value); setShowSug(true); }}
              onKeyDown={e => { if (e.key === 'Enter') { setShowSug(false); handleNLSearch(); } if (e.key === 'Escape') setShowSug(false); }}
              onFocus={() => setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 150)}
            />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>
              {parsing ? '⏳' : '🔍'}
            </span>
          </div>
          <button
            onClick={() => { setShowSug(false); handleNLSearch(); }}
            disabled={parsing || !query.trim()}
            style={{ ...btn('primary', 'md'), flexShrink: 0, opacity: parsing ? 0.6 : 1 }}
          >
            {parsing ? 'Parsing…' : '🤖 AI Search'}
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSug && (suggestions.length > 0 || sugLoading) && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
            overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          }}>
            {sugLoading && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: C.dim }}>🤖 AI generating suggestions…</div>
            )}
            {suggestions.map((s, i) => (
              <div key={i} onClick={() => { setQuery(s); setShowSug(false); }}
                style={{
                  padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: C.muted,
                  borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,158,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                🔍 {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters grid */}
      {!compact && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          <div>
            {lbl('City')}
            <input style={sel} placeholder="Any city" value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <div>
            {lbl('Type')}
            <select style={sel} value={type} onChange={e => setType(e.target.value)}>
              <option value="">All Types</option>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            {lbl('Beds')}
            <select style={sel} value={bedrooms} onChange={e => setBedrooms(e.target.value)}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
          <div>
            {lbl('Min Price')}
            <input style={sel} type="number" placeholder="e.g. 150000" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
          </div>
          <div>
            {lbl('Max Price')}
            <input style={sel} type="number" placeholder="e.g. 600000" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>
          <div>
            {lbl('Furnishing')}
            <select style={sel} value={furnishing} onChange={e => setFurnishing(e.target.value)}>
              <option value="">Any</option>
              <option>Unfurnished</option>
              <option>Part Furnished</option>
              <option>Fully Furnished</option>
            </select>
          </div>
          <div>
            {lbl('Sort')}
            <select style={sel} value={sort} onChange={e => setSort(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleSearch} style={{ ...btn('ghost', 'md'), width: '100%', justifyContent: 'center' }}>
              Filter Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
