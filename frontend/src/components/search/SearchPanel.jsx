import { useState } from 'react';
import { C, T, btn, PROPERTY_TYPES, UK_CITIES, SORT_OPTIONS } from '../../utils/design.js';

export default function SearchPanel({ onSearch, initialParams = {} }) {
  const [params, setParams] = useState({
    city: initialParams.city || '',
    query: initialParams.query || '',
    type: initialParams.type || '',
    min_price: '',
    max_price: '',
    bedrooms: '',
    furnishing: '',
    sort: 'featured',
    ...initialParams,
  });

  const set = (k, v) => setParams(p => ({ ...p, [k]: v }));

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text,
    fontSize: 13, fontFamily: T.body,
    outline: 'none', boxSizing: 'border-box',
  };

  const selectStyle = { ...inputStyle };

  const label = text => (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>{text}</div>
  );

  function handleSearch(e) {
    e.preventDefault();
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''));
    onSearch(clean);
  }

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 24,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          {label('Search')}
          <input
            style={inputStyle}
            placeholder="Area, project, or address…"
            value={params.query}
            onChange={e => set('query', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch(e)}
          />
        </div>

        <div>
          {label('City')}
          <select style={selectStyle} value={params.city} onChange={e => set('city', e.target.value)}>
            <option value="">All Cities</option>
            {UK_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          {label('Property Type')}
          <select style={selectStyle} value={params.type} onChange={e => set('type', e.target.value)}>
            <option value="">All Types</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          {label('Bedrooms')}
          <select style={selectStyle} value={params.bedrooms} onChange={e => set('bedrooms', e.target.value)}>
            <option value="">Any</option>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Bed{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>

        <div>
          {label('Min Price (£)')}
          <input
            style={inputStyle}
            type="number"
            placeholder="e.g. 150000"
            value={params.min_price}
            onChange={e => set('min_price', e.target.value)}
          />
        </div>

        <div>
          {label('Max Price (£)')}
          <input
            style={inputStyle}
            type="number"
            placeholder="e.g. 500000"
            value={params.max_price}
            onChange={e => set('max_price', e.target.value)}
          />
        </div>

        <div>
          {label('Furnishing')}
          <select style={selectStyle} value={params.furnishing} onChange={e => set('furnishing', e.target.value)}>
            <option value="">Any</option>
            <option>Unfurnished</option>
            <option>Part Furnished</option>
            <option>Fully Furnished</option>
          </select>
        </div>

        <div>
          {label('Sort By')}
          <select style={selectStyle} value={params.sort} onChange={e => set('sort', e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={handleSearch} style={{ ...btn('primary', 'md'), width: '100%', justifyContent: 'center' }}>
            🔍 Search
          </button>
        </div>
      </div>
    </div>
  );
}
