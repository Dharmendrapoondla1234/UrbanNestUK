import { useState, useEffect, useCallback } from 'react';
import { C, T, fmt, btn } from '../utils/design.js';
import { searchProperties } from '../services/api.js';
import PropertyCard from '../components/property/PropertyCard.jsx';
import SearchPanel from '../components/search/SearchPanel.jsx';
import PropertyDetail from '../components/property/PropertyDetail.jsx';

export default function Search({ initialParams = {} }) {
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState(initialParams);
  const [selected, setSelected] = useState(null);
  const LIMIT = 20;

  const doSearch = useCallback(async (p, pg = 1) => {
    setLoading(true);
    try {
      const data = await searchProperties({ ...p, page: pg, limit: LIMIT });
      setResults(pg === 1 ? data.items || [] : prev => [...prev, ...(data.items || [])]);
      setTotal(data.total || 0);
      setPage(pg);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { doSearch(params, 1); }, [params]);

  function handleSearch(newParams) {
    setParams(newParams);
    setPage(1);
    setResults([]);
  }

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: T.display, fontSize: 28, fontWeight: 900, color: C.text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          Property Search
        </h1>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
          {total > 0 ? `${total.toLocaleString()} properties found` : 'Search the UK property market'}
        </p>
      </div>

      <SearchPanel onSearch={handleSearch} initialParams={params} />

      <div style={{ marginTop: 28 }}>
        {loading && results.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Spinner />
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.muted }}>No properties found</div>
            <div style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>Try adjusting your filters</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {results.map(p => (
                <PropertyCard key={p.id} property={p} onClick={setSelected} />
              ))}
            </div>
            {results.length < total && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button
                  onClick={() => doSearch(params, page + 1)}
                  disabled={loading}
                  style={{ ...btn('secondary', 'lg'), opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? 'Loading…' : `Load More (${total - results.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selected && <PropertyDetail property={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      border: `3px solid rgba(255,255,255,0.1)`,
      borderTopColor: C.blue,
      animation: 'spin 0.8s linear infinite',
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
