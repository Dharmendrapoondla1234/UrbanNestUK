import { useState, useEffect, useCallback } from 'react';
import { C, T, btn } from '../utils/design.js';
import { searchProperties } from '../services/api.js';
import { useGlobal } from '../hooks/useGlobal.jsx';
import PropertyCard from '../components/property/PropertyCard.jsx';
import SearchPanel from '../components/search/SearchPanel.jsx';
import PropertyDetail from '../components/property/PropertyDetail.jsx';

export default function Search({ initialParams = {} }) {
  const { country } = useGlobal();
  const [results, setResults]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [params, setParams]     = useState(initialParams);
  const [selected, setSelected] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const LIMIT = 20;

  const doSearch = useCallback(async (p, pg = 1) => {
    setLoading(true);
    setAiSummary('');
    try {
      const data = await searchProperties({ ...p, page: pg, limit: LIMIT });
      const items = data.items || [];
      setResults(pg === 1 ? items : prev => {
        const ids = new Set(prev.map(x => x.id));
        return [...prev, ...items.filter(x => !ids.has(x.id))];
      });
      setTotal(data.total || 0);
      setPage(pg);
      if (pg === 1 && items.length > 0) {
        setAiSummary(`Found ${data.total} properties. Showing ${items.length} results${p.city ? ` in ${p.city}` : ''}${p.type ? ` — ${p.type}` : ''}${p.max_price ? ` under £${Number(p.max_price).toLocaleString()}` : ''}.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { doSearch(params, 1); }, [params]);
  // Sync with initialParams changes
  useEffect(() => {
    if (JSON.stringify(initialParams) !== JSON.stringify(params)) {
      setParams(initialParams);
    }
  }, [initialParams]);

  function handleSearch(newParams) {
    setParams(newParams);
    setPage(1);
    setResults([]);
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: T.display, fontSize: 26, fontWeight: 900, color: C.text, margin: '0 0 5px', letterSpacing: '-0.5px' }}>
          Property Search
        </h1>
        {aiSummary && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 99,
            background: 'rgba(79,158,255,0.1)', border: '1px solid rgba(79,158,255,0.2)',
            fontSize: 12, color: C.blue,
          }}>
            🤖 {aiSummary}
          </div>
        )}
      </div>

      <SearchPanel onSearch={handleSearch} initialParams={params} />

      <div style={{ marginTop: 24 }}>
        {loading && results.length === 0 ? (
          <LoadingGrid />
        ) : results.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: C.dim }}>
                Showing <strong style={{ color: C.muted }}>{results.length}</strong> of <strong style={{ color: C.muted }}>{total}</strong> properties
              </span>
              {loading && <span style={{ fontSize: 12, color: C.blue }}>↻ Loading…</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 18 }}>
              {results.map(p => (
                <PropertyCard key={p.id} property={p} onClick={setSelected} country={country} />
              ))}
            </div>
            {results.length < total && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button
                  onClick={() => doSearch(params, page + 1)}
                  disabled={loading}
                  style={{ ...btn('secondary', 'lg'), opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? '⏳ Loading…' : `Load More · ${total - results.length} remaining`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selected && <PropertyDetail property={selected} onClose={() => setSelected(null)} country={country} />}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 18 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 14, overflow: 'hidden', height: 340,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <div style={{ height: 195, background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ padding: 14 }}>
            <div style={{ height: 18, background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginBottom: 8, width: '60%' }} />
            <div style={{ height: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 6, width: '80%' }} />
          </div>
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.muted, fontFamily: T.display }}>No properties found</div>
      <div style={{ fontSize: 13, color: C.dim, marginTop: 7 }}>Try broadening your filters or use the AI search bar above</div>
    </div>
  );
}
