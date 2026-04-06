import { useState, useEffect } from 'react';
import { C, T, fmt, btn, PROPERTY_TYPES, PROPERTY_ICONS } from '../utils/design.js';
import { getFeatured } from '../services/api.js';
import { useGlobal } from '../hooks/useGlobal.jsx';
import PropertyCard from '../components/property/PropertyCard.jsx';
import PropertyDetail from '../components/property/PropertyDetail.jsx';
import SearchPanel from '../components/search/SearchPanel.jsx';

const STATS = [
  { value: '2M+', label: 'Global Listings', icon: '🏘️' },
  { value: '50+', label: 'Countries', icon: '🌍' },
  { value: '97%', label: 'Match Accuracy', icon: '🎯' },
  { value: '£48B+', label: 'Transactions', icon: '💷' },
];

export default function Home({ setPage, setSearchParams }) {
  const { country, city } = useGlobal();
  const [featured, setFeatured] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getFeatured(6).then(d => setFeatured(d.items || [])).catch(() => {});
  }, []);

  function handleSearch(params) {
    setSearchParams(params);
    setPage('search');
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{
        position: 'relative', padding: '70px 24px 56px', textAlign: 'center',
        background: 'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(79,158,255,0.12) 0%, transparent 65%)',
        overflow: 'hidden',
      }}>
        {/* Decorative grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(79,158,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(79,158,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)',
        }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 99, marginBottom: 22,
          background: 'rgba(79,158,255,0.1)', border: '1px solid rgba(79,158,255,0.2)',
          fontSize: 11, color: C.blue, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>
          ✦ AI-Powered Global Property Intelligence
        </div>

        <h1 style={{
          fontFamily: T.display, fontSize: 'clamp(34px,6.5vw,70px)',
          fontWeight: 900, color: C.text, margin: '0 0 14px',
          lineHeight: 1.08, letterSpacing: '-2.5px',
        }}>
          Find Your Perfect<br />
          <span style={{ background: 'linear-gradient(90deg,#4f9eff,#818cf8,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Dream Property
          </span>
        </h1>

        <p style={{ color: C.muted, fontSize: 16, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.65 }}>
          Agentic AI that understands your intent, searches globally, and delivers only verified, highly relevant properties.
        </p>

        {/* Search */}
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          <SearchPanel onSearch={handleSearch} compact={true} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 40, padding: '24px 24px', flexWrap: 'wrap', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        {STATS.map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: '-1px' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Property Types */}
      <div style={{ padding: '52px 24px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h2 style={{ fontFamily: T.display, fontSize: 30, fontWeight: 900, color: C.text, margin: '0 0 7px', letterSpacing: '-1px' }}>All Property Types</h2>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Search across residential, commercial & land worldwide</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {PROPERTY_TYPES.map(type => (
            <button key={type} onClick={() => { setSearchParams({ type }); setPage('search'); }} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '16px 10px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
              transition: 'all 0.2s', fontFamily: T.body,
            }}
              onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(79,158,255,0.4)'; e.currentTarget.style.background = 'rgba(79,158,255,0.05)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${C.border}`; e.currentTarget.style.background = C.surface; e.currentTarget.style.transform = 'none'; }}
            >
              <span style={{ fontSize: 28 }}>{PROPERTY_ICONS[type]}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div style={{ padding: '0 24px 60px', maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div>
              <h2 style={{ fontFamily: T.display, fontSize: 26, fontWeight: 900, color: C.text, margin: '0 0 5px', letterSpacing: '-0.5px' }}>Featured in {city}</h2>
              <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>AI-curated top listings</p>
            </div>
            <button onClick={() => setPage('search')} style={{ ...btn('secondary', 'sm') }}>View All →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 18 }}>
            {featured.map(p => <PropertyCard key={p.id} property={p} onClick={setSelected} country={country} />)}
          </div>
        </div>
      )}

      {/* AI Features banner */}
      <div style={{
        margin: '0 24px 60px', maxWidth: 1032, marginLeft: 'auto', marginRight: 'auto',
        background: 'linear-gradient(135deg,rgba(79,158,255,0.08),rgba(129,140,248,0.08))',
        border: '1px solid rgba(79,158,255,0.18)', borderRadius: 20, padding: '36px 32px',
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center',
      }}>
        <div>
          <h3 style={{ fontFamily: T.display, fontSize: 22, fontWeight: 900, color: C.text, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Fully Agentic AI Architecture
          </h3>
          <p style={{ color: C.muted, fontSize: 13, margin: 0, maxWidth: 460, lineHeight: 1.65 }}>
            Multiple specialized AI agents work in parallel — parsing intent, fetching data, validating results, predicting prices, and generating market intelligence — all in real time.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[['🤖','AI Advisor'],['💰','Price AI'],['📊','Market Intel'],['🗺️','Smart Map']].map(([icon, label]) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
              fontSize: 12, color: C.text, fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 16 }}>{icon}</span>{label}
            </div>
          ))}
        </div>
      </div>

      {selected && <PropertyDetail property={selected} onClose={() => setSelected(null)} country={country} />}
    </div>
  );
}
