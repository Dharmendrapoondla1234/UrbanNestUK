/**
 * UrbanNest AI — Home Page
 * Landing page with NL search hero, featured properties, country switcher.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFeatured, fmtPrice } from '../services/api.js';
import { useGlobal } from '../hooks/useGlobal.jsx';

const HERO_QUERIES = {
  india: ['2BHK under 50 lakhs near IT parks', '3BHK villa in Pune', 'furnished flat Bangalore under ₹30,000/mo'],
  uk:    ['apartments in London under £400k', '3-bed house Manchester', 'studio near tube under £250k'],
};

export default function Home() {
  const navigate = useNavigate();
  const { country, city, cities, changeCountry, changeCity, symbol } = useGlobal();
  const [query, setQuery]     = useState('');
  const [featured, setFeatured] = useState([]);
  const [loadingFeat, setLoadingFeat] = useState(true);

  useEffect(() => {
    setLoadingFeat(true);
    getFeatured({ country, limit: 6 })
      .then(d => setFeatured(d.items || []))
      .catch(() => setFeatured([]))
      .finally(() => setLoadingFeat(false));
  }, [country]);

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}&country=${country}&city=${city || ''}`);
    } else {
      navigate(`/search?country=${country}&city=${city || ''}`);
    }
  }

  const examples = HERO_QUERIES[country] || HERO_QUERIES.uk;

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg,#0F172A 0%,#1E3A8A 100%)',
        padding: '64px 24px 56px', textAlign: 'center',
      }}>
        {/* Country toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {[['uk', '🇬🇧 United Kingdom'], ['india', '🇮🇳 India']].map(([c, label]) => (
            <button key={c} onClick={() => changeCountry(c)} style={{
              padding: '7px 18px', borderRadius: 20,
              background: country === c ? '#fff' : 'rgba(255,255,255,0.1)',
              color: country === c ? '#0F172A' : 'rgba(255,255,255,0.8)',
              border: `1px solid ${country === c ? '#fff' : 'rgba(255,255,255,0.2)'}`,
              fontSize: 13, fontWeight: country === c ? 700 : 400, cursor: 'pointer',
            }}>
              {label}
            </button>
          ))}
        </div>

        <h1 style={{ margin: '0 0 12px', fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-1px' }}>
          Find Your Perfect Home
        </h1>
        <p style={{ margin: '0 0 32px', fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>
          AI-powered property search for {country === 'india' ? '🇮🇳 India' : '🇬🇧 United Kingdom'}
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{ maxWidth: 680, margin: '0 auto 20px', display: 'flex', gap: 8 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={examples[0]}
            style={{
              flex: 1, padding: '16px 20px', borderRadius: 12, border: 'none',
              fontSize: 15, background: '#fff', outline: 'none', color: '#0F172A',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          />
          <button type="submit" style={{
            padding: '16px 28px', borderRadius: 12, background: '#1B4FD8',
            color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15,
            boxShadow: '0 4px 20px rgba(27,79,216,0.4)',
          }}>
            Search
          </button>
        </form>

        {/* City selector */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          {cities.slice(0, 6).map(c => (
            <button key={c} onClick={() => { changeCity(c); navigate(`/search?country=${country}&city=${c}`); }}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12,
                background: city === c ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
              }}>
              {c}
            </button>
          ))}
        </div>

        {/* Example queries */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
          {examples.slice(1).map(ex => (
            <button key={ex} onClick={() => { setQuery(ex); }} style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 11,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            }}>
              "{ex}"
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{
        background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
        padding: '16px 24px', display: 'flex', justifyContent: 'center', gap: 48,
      }}>
        {[
          ['10,000+', 'Properties'],
          ['2', 'Countries'],
          ['Real-time', 'AI Search'],
          ['Free', 'Alerts'],
        ].map(([stat, label]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0F172A' }}>{stat}</div>
            <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Featured properties ── */}
      <div style={{ padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A' }}>
            ⭐ Featured Properties
          </h2>
          <button onClick={() => navigate(`/search?country=${country}&city=${city || ''}`)} style={{
            padding: '7px 14px', borderRadius: 8, background: 'transparent',
            border: '1px solid #E5E7EB', fontSize: 13, color: '#374151', cursor: 'pointer',
          }}>
            View all →
          </button>
        </div>

        {loadingFeat ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: '#F3F4F6', borderRadius: 12, height: 300 }} />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
            No featured properties yet. Check back soon!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
            {featured.map(p => (
              <FeaturedCard key={p.id} property={p} country={country} symbol={symbol}
                onClick={() => navigate(`/search?country=${country}&city=${encodeURIComponent(p.city || '')}`)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Features section ── */}
      <div style={{ background: '#F9FAFB', padding: '48px 24px', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 900, color: '#0F172A', margin: '0 0 32px' }}>
            Powered by AI
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 20 }}>
            {[
              ['🤖', 'AI Natural Language Search', 'Search in plain English or Hindi. "2BHK near IT park under 50L" just works.'],
              ['🗺️', 'Interactive Map Search', 'Drop a pin anywhere. AI analyses the neighbourhood and finds nearby listings.'],
              ['📈', 'Market Intelligence', 'AI-generated price forecasts, rental yields, and investment scores for any area.'],
              ['🔔', 'Smart Alerts', 'Get notified the moment a property matching your criteria is listed.'],
              ['🏘️', 'Similar Properties', 'Vector-based semantic search finds truly similar properties, not just keyword matches.'],
              ['💬', 'Property Advisor', 'Chat with an AI expert about SDLT, RERA, leasehold, investment strategy and more.'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{
                background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px 16px',
              }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedCard({ property: p, country, symbol, onClick }) {
  const img = Array.isArray(p.images) && p.images[0]
    ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0].url)
    : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=70';

  return (
    <div onClick={onClick} style={{
      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
      overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ position: 'relative', height: 190 }}>
        <img src={img} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=70'; }} />
        <span style={{
          position: 'absolute', top: 8, left: 8, padding: '2px 8px',
          background: '#1B4FD8', color: '#fff', borderRadius: 6, fontSize: 10, fontWeight: 700,
        }}>FEATURED</span>
        {p.data_source && (
          <span style={{
            position: 'absolute', bottom: 8, right: 8, padding: '2px 7px',
            background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 5, fontSize: 9,
          }}>via {p.data_source}</span>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 19, fontWeight: 900, color: '#0F172A', marginBottom: 2 }}>
          {p.price_display || fmtPrice(p.price / 100, country)}
        </div>
        <div style={{ fontSize: 12, color: '#374151', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#6B7280' }}>📍 {p.area}, {p.city}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {p.bedrooms ? <span style={{ fontSize: 10, color: '#374151' }}>🛏 {p.bedrooms}</span> : null}
            {p.area_sqft ? <span style={{ fontSize: 10, color: '#374151' }}>{p.area_sqft}ft²</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
