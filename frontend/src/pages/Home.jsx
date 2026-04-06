import { C, T } from '../utils/design.js';

export default function Home({ setPage, setSearchParams }) {
  function go(q, country = 'United Kingdom') {
    setSearchParams({ query: q, country });
  }

  const features = [
    { icon: '🔍', title: 'Global Search', desc: 'AI-powered property search across 15+ countries' },
    { icon: '🗺', title: 'Map Search', desc: 'Click the map to explore and find nearby properties' },
    { icon: '🤖', title: 'AI Advisor', desc: 'Expert property advice powered by Gemini AI' },
    { icon: '📈', title: 'Price Predict', desc: 'Get accurate AI valuations and market forecasts' },
    { icon: '📊', title: 'Market Analysis', desc: 'Deep market intelligence for any city worldwide' },
  ];

  const quickSearches = [
    '2 bed flat London under £400k',
    'Family home Manchester with garden',
    'Studio apartment Edinburgh',
    'Investment property Birmingham',
    'Luxury penthouse Dubai',
    'Beachfront villa Spain',
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🏡</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f0f2f8', fontFamily: T.display, marginBottom: 10 }}>
          UrbanNest
        </h1>
        <p style={{ fontSize: 16, color: C.muted, maxWidth: 500, margin: '0 auto 32px' }}>
          AI-powered global property platform. Search, analyse, and invest with Gemini AI.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage('search')}
            style={{ background: 'linear-gradient(135deg,#4285f4,#34a853)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            🔍 Search Properties
          </button>
          <button
            onClick={() => setPage('advisor')}
            style={{ background: 'transparent', color: '#4285f4', border: '1px solid #4285f4', borderRadius: 10, padding: '13px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            🤖 AI Advisor
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 48 }}>
        {features.map(f => (
          <div
            key={f.title}
            onClick={() => setPage(f.title.toLowerCase().replace(' ', '_') === 'global_search' ? 'search' : f.title.toLowerCase().replace(' ', '_').replace('ai_', '').replace('price_', 'predict').replace('map_search','map').replace('market_analysis','market'))}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(66,133,244,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ''; }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f2f8', marginBottom: 6 }}>{f.title}</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Quick Searches</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {quickSearches.map(q => (
            <button
              key={q}
              onClick={() => go(q)}
              style={{ background: 'rgba(66,133,244,0.1)', color: '#4285f4', border: '1px solid rgba(66,133,244,0.25)', borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
