/**
 * UrbanNest AI — Search Page
 * Natural language + filter search for India & UK.
 * Reads URL params: ?q=...&country=...&city=...&id=...
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchNL, searchFilter, getProperty, fmtPrice } from '../services/api.js';
import { useGlobal } from '../hooks/useGlobal.jsx';

const EXAMPLE_QUERIES = {
  india: [
    '2BHK under 50 lakhs near IT parks',
    '3BHK flat in Pune under 80L with parking',
    'furnished 1BHK for rent in Bangalore under ₹25,000',
    'villa in Gurgaon under 2 crore with pool',
  ],
  uk: [
    'apartments for rent in London under £1500',
    '3-bed house in Manchester under £300k',
    'studio flat near tube station under £250k',
    'detached house Edinburgh with garden under £500k',
  ],
};

export default function Search() {
  const [searchParams]              = useSearchParams();
  const { country, city, symbol, cities, propTypes } = useGlobal();

  // Read URL params on mount
  const urlQ       = searchParams.get('q') || '';
  const urlCountry = searchParams.get('country') || country;
  const urlCity    = searchParams.get('city')    || city;
  const urlId      = searchParams.get('id')      || '';

  const [query, setQuery]         = useState(urlQ);
  const [mode, setMode]           = useState(urlQ ? 'nl' : 'filter');
  const [results, setResults]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [aiResponse, setAiResponse] = useState('');
  const [filterSummary, setFilterSummary] = useState('');
  const [selected, setSelected]   = useState(null);
  const [filters, setFilters]     = useState({
    country: urlCountry,
    city:    urlCity,
    sort:    'featured',
  });

  const initialised = useRef(false);
  const LIMIT = 24;

  // On mount: handle URL params
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    if (urlId) {
      // Load a specific property by ID
      getProperty(urlId)
        .then(p => { setResults([p]); setTotal(1); })
        .catch(() => doFilterSearch({ country: urlCountry, city: urlCity }));
    } else if (urlQ) {
      doNLSearch(urlQ, urlCountry, urlCity);
    } else {
      doFilterSearch({ country: urlCountry, city: urlCity });
    }
  }, []); // eslint-disable-line

  // Re-search when global country/city changes
  useEffect(() => {
    if (!initialised.current) return;
    const newFilters = { ...filters, country, city };
    setFilters(newFilters);
    doFilterSearch(newFilters);
  }, [country, city]); // eslint-disable-line

  const doNLSearch = useCallback(async (q, c, ct, pg = 1) => {
    if (!q?.trim()) return;
    setLoading(true);
    setError(null);
    if (pg === 1) { setAiResponse(''); setResults([]); }
    try {
      const data = await searchNL({ q, country: c || country, city: ct || city, rag: true });
      const items = data.items || [];
      if (pg === 1) {
        setResults(items);
        setTotal(data.total || 0);
        setFilterSummary(data.filter_summary || `${data.total || 0} results`);
        if (data.ai_response) setAiResponse(data.ai_response);
      } else {
        setResults(prev => {
          const ids = new Set(prev.map(x => x.id));
          return [...prev, ...items.filter(x => !ids.has(x.id))];
        });
      }
      setPage(pg);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [country, city]);

  const doFilterSearch = useCallback(async (params, pg = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchFilter({ ...params, page: pg, limit: LIMIT });
      const items = data.items || [];
      if (pg === 1) {
        setResults(items);
        setTotal(data.total || 0);
        setFilterSummary(`${data.total || 0} properties found`);
        setAiResponse('');
      } else {
        setResults(prev => {
          const ids = new Set(prev.map(x => x.id));
          return [...prev, ...items.filter(x => !ids.has(x.id))];
        });
      }
      setPage(pg);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleNLSubmit(e) {
    e.preventDefault();
    if (query.trim()) {
      setMode('nl');
      doNLSearch(query, filters.country, filters.city);
    }
  }

  function handleFilterChange(f) {
    setFilters(f);
    setMode('filter');
    doFilterSearch(f);
  }

  function loadMore() {
    if (mode === 'nl') doNLSearch(query, filters.country, filters.city, page + 1);
    else doFilterSearch(filters, page + 1);
  }

  const examples = EXAMPLE_QUERIES[country] || EXAMPLE_QUERIES.uk;

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['nl', '🤖 AI Natural Search'], ['filter', '⚙️ Filter Search']].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: mode === m ? '#1B4FD8' : 'transparent',
            color: mode === m ? '#fff' : '#6B7280',
            border: `1px solid ${mode === m ? '#1B4FD8' : '#E5E7EB'}`,
          }}>{label}</button>
        ))}
      </div>

      {/* NL Search bar */}
      {mode === 'nl' && (
        <div style={{ marginBottom: 20 }}>
          <form onSubmit={handleNLSubmit} style={{ display: 'flex', gap: 8 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={examples[0]}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 10,
                border: '1.5px solid #E5E7EB', fontSize: 14, background: '#F9FAFB', outline: 'none',
              }}
            />
            <button type="submit" disabled={loading} style={{
              padding: '12px 24px', borderRadius: 10, background: '#1B4FD8',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
              fontSize: 14, opacity: loading ? 0.6 : 1,
            }}>
              {loading ? '⏳' : '🔍 Search'}
            </button>
          </form>
          {/* Example chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {examples.map(ex => (
              <button key={ex} onClick={() => { setQuery(ex); doNLSearch(ex, filters.country, filters.city); }}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11,
                  background: 'rgba(27,79,216,0.07)', border: '1px solid rgba(27,79,216,0.2)',
                  color: '#1B4FD8', cursor: 'pointer',
                }}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      {mode === 'filter' && (
        <FilterBar filters={filters} onChange={handleFilterChange} cities={cities} propTypes={propTypes} />
      )}

      {/* AI response card */}
      {aiResponse && (
        <div style={{
          padding: '12px 16px', marginBottom: 16, borderRadius: 10,
          background: 'rgba(27,79,216,0.05)', border: '1px solid rgba(27,79,216,0.15)',
          fontSize: 14, color: '#374151', lineHeight: 1.65,
        }}>
          🤖 {aiResponse}
        </div>
      )}

      {/* Results summary */}
      {(filterSummary || loading) && (
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12, display: 'flex', gap: 10 }}>
          <span>{filterSummary}</span>
          {loading && <span style={{ color: '#1B4FD8' }}>↻ Searching…</span>}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, color: '#991B1B', fontSize: 13, marginBottom: 12,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {loading && results.length === 0 ? (
        <LoadingGrid />
      ) : !loading && results.length === 0 ? (
        <EmptyState country={country} examples={examples} onTry={q => { setQuery(q); setMode('nl'); doNLSearch(q, filters.country, filters.city); }} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
            {results.map(p => (
              <PropertyCard key={p.id} property={p} country={country} symbol={symbol}
                onSelect={() => setSelected(p)} />
            ))}
          </div>
          {results.length < total && (
            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <button onClick={loadMore} disabled={loading} style={{
                padding: '10px 24px', borderRadius: 8, background: '#F3F4F6',
                border: '1px solid #E5E7EB', fontSize: 13, cursor: 'pointer',
                color: '#374151', opacity: loading ? 0.6 : 1,
              }}>
                {loading ? '⏳ Loading…' : `Load more · ${total - results.length} remaining`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Property detail modal */}
      {selected && <PropertyModal property={selected} country={country} symbol={symbol} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function FilterBar({ filters, onChange, cities, propTypes }) {
  const f   = filters;
  const set = (k, v) => onChange({ ...f, [k]: v || undefined });
  const inp = {
    padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E7EB',
    fontSize: 13, background: '#F9FAFB', outline: 'none', width: '100%',
  };
  const lbl = t => (
    <label style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4, letterSpacing: '0.5px' }}>
      {t}
    </label>
  );

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 10, alignItems: 'end' }}>
        <div>
          {lbl('CITY')}
          <select style={inp} value={f.city || ''} onChange={e => set('city', e.target.value)}>
            <option value="">Any city</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          {lbl('PROPERTY TYPE')}
          <select style={inp} value={f.property_type || ''} onChange={e => set('property_type', e.target.value)}>
            <option value="">All types</option>
            {propTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          {lbl('BEDROOMS')}
          <select style={inp} value={f.bedrooms || ''} onChange={e => set('bedrooms', e.target.value ? +e.target.value : null)}>
            <option value="">Any</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        <div>
          {lbl('MAX PRICE')}
          <input type="number" style={inp} placeholder="e.g. 500000"
            value={f.max_price || ''} onChange={e => set('max_price', e.target.value ? +e.target.value : null)} />
        </div>
        <div>
          {lbl('FURNISHING')}
          <select style={inp} value={f.furnishing || ''} onChange={e => set('furnishing', e.target.value)}>
            <option value="">Any</option>
            {['Unfurnished','Semi-Furnished','Fully Furnished'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          {lbl('SORT BY')}
          <select style={inp} value={f.sort || 'featured'} onChange={e => set('sort', e.target.value)}>
            <option value="featured">Featured</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function PropertyCard({ property: p, country, symbol, onSelect }) {
  const [saved, setSaved] = useState(false);
  const imgs = (p.images || []).map(i => typeof i === 'string' ? i : i?.url).filter(Boolean);
  const img  = imgs[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=70';

  return (
    <div
      onClick={onSelect}
      style={{
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
        overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ position: 'relative', height: 185 }}>
        <img src={img} alt={p.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=70'; }}
        />
        {p.featured && (
          <span style={{
            position: 'absolute', top: 8, left: 8, padding: '2px 8px',
            background: '#FBBF24', color: '#78350F', borderRadius: 6, fontSize: 10, fontWeight: 700,
          }}>⭐ FEATURED</span>
        )}
        <button
          onClick={e => { e.stopPropagation(); setSaved(s => !s); }}
          style={{
            position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', fontSize: 15,
          }}
        >
          {saved ? '❤️' : '🤍'}
        </button>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 19, fontWeight: 900, color: '#0F172A', marginBottom: 3 }}>
          {p.price_display || fmtPrice(p.price ? p.price / 100 : 0, country)}
        </div>
        <div style={{ fontSize: 12, color: '#374151', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#6B7280' }}>📍 {p.area}, {p.city}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {p.bedrooms   != null && <span style={{ fontSize: 10, color: '#374151' }}>🛏 {p.bedrooms}</span>}
            {p.bathrooms  != null && <span style={{ fontSize: 10, color: '#374151' }}>🚿 {p.bathrooms}</span>}
            {p.area_sqft  != null && <span style={{ fontSize: 10, color: '#374151' }}>{p.area_sqft}ft²</span>}
          </div>
        </div>
        {p.data_source && (
          <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 6, textTransform: 'uppercase' }}>
            via {p.data_source}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyModal({ property: p, country, symbol, onClose }) {
  const imgs = (p.images || []).map(i => typeof i === 'string' ? i : i?.url).filter(Boolean);
  const img  = imgs[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=70';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ position: 'relative' }}>
          <img src={img} alt={p.title} style={{ width: '100%', height: 240, objectFit: 'cover' }}
            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=70'; }} />
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12, width: 32, height: 32,
            borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none',
            color: '#fff', fontSize: 16, cursor: 'pointer',
          }}>✕</button>
        </div>

        <div style={{ padding: '20px 22px 24px' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>
            {p.price_display || fmtPrice(p.price ? p.price / 100 : 0, country)}
          </div>
          <div style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>{p.title}</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>📍 {p.area}, {p.city}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
            {[
              ['🛏', p.bedrooms != null ? `${p.bedrooms} Beds` : '—'],
              ['🚿', p.bathrooms != null ? `${p.bathrooms} Baths` : '—'],
              ['📐', p.area_sqft ? `${p.area_sqft} sqft` : '—'],
              ['🏠', p.property_type || '—'],
              ['🔑', p.tenure || '—'],
              ['⚡', p.epc_rating ? `EPC ${p.epc_rating}` : '—'],
            ].map(([icon, val]) => (
              <div key={val} style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{val}</div>
              </div>
            ))}
          </div>

          {p.amenities?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
              {p.amenities.slice(0, 8).map(a => (
                <span key={a} style={{
                  padding: '3px 9px', borderRadius: 20, fontSize: 11,
                  background: 'rgba(27,79,216,0.07)', border: '1px solid rgba(27,79,216,0.2)', color: '#1B4FD8',
                }}>{a}</span>
              ))}
            </div>
          )}

          {p.description && (
            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65, marginBottom: 16 }}>
              {p.description.slice(0, 300)}{p.description.length > 300 ? '…' : ''}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {p.source_url && (
              <a href={p.source_url} target="_blank" rel="noreferrer" style={{
                flex: 1, display: 'block', textAlign: 'center', padding: '11px',
                background: '#1B4FD8', color: '#fff', borderRadius: 9,
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}>View Listing →</a>
            )}
            {p.lat && p.lng && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                target="_blank" rel="noreferrer" style={{
                  padding: '11px 16px', background: '#F9FAFB', border: '1px solid #E5E7EB',
                  borderRadius: 9, fontSize: 13, color: '#374151', textDecoration: 'none',
                }}>🗺️</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ background: '#F3F4F6', borderRadius: 12, height: 310, animation: 'pulse 1.5s infinite' }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

function EmptyState({ country, examples, onTry }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>🔍</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No properties found</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Try broadening your filters or use AI search</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {examples.slice(0, 3).map(ex => (
          <button key={ex} onClick={() => onTry(ex)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11,
            background: 'rgba(27,79,216,0.07)', border: '1px solid rgba(27,79,216,0.2)',
            color: '#1B4FD8', cursor: 'pointer',
          }}>Try: "{ex}"</button>
        ))}
      </div>
    </div>
  );
}
