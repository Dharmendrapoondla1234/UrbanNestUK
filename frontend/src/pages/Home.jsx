import { useState, useEffect } from 'react';
import { C, T, fmt, btn, PROPERTY_TYPES, PROPERTY_ICONS, UK_CITIES } from '../utils/design.js';
import { getFeatured } from '../services/api.js';
import PropertyCard from '../components/property/PropertyCard.jsx';
import PropertyDetail from '../components/property/PropertyDetail.jsx';

const STATS = [
  { value: '120,000+', label: 'Properties Listed' },
  { value: '50+', label: 'UK Cities Covered' },
  { value: '97%', label: 'Customer Satisfaction' },
  { value: '£8.2B+', label: 'Transactions' },
];

export default function Home({ setPage, setSearchParams }) {
  const [featured, setFeatured] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCity, setSearchCity] = useState('London');
  const [searchType, setSearchType] = useState('');

  useEffect(() => {
    getFeatured(6).then(d => setFeatured(d.items || [])).catch(() => {});
  }, []);

  function handleSearch() {
    setSearchParams({ query: searchQuery, city: searchCity, type: searchType });
    setPage('search');
  }

  function handleTypeClick(type) {
    setSearchParams({ type });
    setPage('search');
  }

  function handleCityClick(city) {
    setSearchParams({ city });
    setPage('search');
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text,
    fontSize: 14, fontFamily: T.body,
    outline: 'none', padding: '10px 14px',
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{
        position: 'relative', padding: '80px 24px 60px',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,140,248,0.15) 0%, transparent 70%)',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 99,
          background: 'rgba(59,140,248,0.1)', border: '1px solid rgba(59,140,248,0.2)',
          fontSize: 12, color: C.blue, fontWeight: 700, marginBottom: 20,
          letterSpacing: '0.3px',
        }}>
          ✦ AI-Powered UK Property Platform
        </div>

        <h1 style={{
          fontFamily: T.display, fontSize: 'clamp(36px, 7vw, 72px)',
          fontWeight: 900, color: C.text, margin: '0 0 12px',
          lineHeight: 1.1, letterSpacing: '-2px',
        }}>
          Find Your Perfect<br />
          <span style={{ background: 'linear-gradient(90deg,#3b8cf8,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dream Property
          </span>
        </h1>

        <p style={{ color: C.muted, fontSize: 17, maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.6 }}>
          AI-driven search, price prediction, and market insights across apartments, villas, penthouses, plots, and commercial spaces.
        </p>

        {/* Search bar */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: 20, maxWidth: 700, margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
        }}>
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 180 }}
            placeholder="🔍 Search area, project, or address…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <select style={{ ...inputStyle }} value={searchCity} onChange={e => setSearchCity(e.target.value)}>
            {UK_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select style={{ ...inputStyle }} value={searchType} onChange={e => setSearchType(e.target.value)}>
            <option value="">All Types</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={handleSearch} style={{
            ...btn('primary', 'md'),
            background: 'linear-gradient(135deg,#3b8cf8,#8b5cf6)',
            padding: '10px 24px', fontWeight: 800,
          }}>
            Search
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 48, padding: '24px 24px', flexWrap: 'wrap', borderBottom: `1px solid ${C.border}` }}>
        {STATS.map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: T.display, fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: '-1px' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Property types grid */}
      <div style={{ padding: '48px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontFamily: T.display, fontSize: 32, fontWeight: 900, color: C.text, margin: '0 0 8px', letterSpacing: '-1px' }}>All Property Types</h2>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Complete coverage of UK residential &amp; commercial property</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {PROPERTY_TYPES.map(type => (
            <button key={type} onClick={() => handleTypeClick(type)} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '18px 12px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              transition: 'all 0.2s', fontFamily: T.body,
            }}
              onMouseEnter={e => { e.currentTarget.style.border = `1px solid rgba(59,140,248,0.4)`; e.currentTarget.style.background = 'rgba(59,140,248,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${C.border}`; e.currentTarget.style.background = C.surface; }}
            >
              <span style={{ fontSize: 30 }}>{PROPERTY_ICONS[type] || '🏠'}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textAlign: 'center' }}>{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured properties */}
      {featured.length > 0 && (
        <div style={{ padding: '0 24px 60px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontFamily: T.display, fontSize: 28, fontWeight: 900, color: C.text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Featured Properties</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Handpicked listings across the UK</p>
            </div>
            <button onClick={() => setPage('search')} style={{ ...btn('secondary', 'sm') }}>
              View All →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {featured.map(p => (
              <PropertyCard key={p.id} property={p} onClick={setSelected} />
            ))}
          </div>
        </div>
      )}

      {/* Cities */}
      <div style={{ padding: '0 24px 60px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 style={{ fontFamily: T.display, fontSize: 28, fontWeight: 900, color: C.text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Explore by City</h2>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Find properties in top UK cities</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {UK_CITIES.map(city => (
            <button key={city} onClick={() => handleCityClick(city)} style={{
              ...btn('ghost', 'md'), fontSize: 14, fontWeight: 600,
            }}>
              🏙️ {city}
            </button>
          ))}
        </div>
      </div>

      {/* AI Features banner */}
      <div style={{
        margin: '0 24px 60px',
        background: 'linear-gradient(135deg,rgba(59,140,248,0.1),rgba(139,92,246,0.1))',
        border: '1px solid rgba(59,140,248,0.2)',
        borderRadius: 20, padding: '40px 32px',
        display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 1052, marginLeft: 'auto', marginRight: 'auto',
      }}>
        <div>
          <h3 style={{ fontFamily: T.display, fontSize: 24, fontWeight: 900, color: C.text, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Powered by Agentic AI
          </h3>
          <p style={{ color: C.muted, fontSize: 14, margin: 0, maxWidth: 420, lineHeight: 1.6 }}>
            Get personalised recommendations, accurate price predictions, and deep market insights — all powered by LLMs and real-time data.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { icon: '🤖', label: 'AI Advisor' },
            { icon: '💰', label: 'Price AI' },
            { icon: '📊', label: 'Market Analysis' },
          ].map(f => (
            <div key={f.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
              fontSize: 13, color: C.text, fontWeight: 600,
            }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span> {f.label}
            </div>
          ))}
        </div>
      </div>

      {selected && <PropertyDetail property={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
