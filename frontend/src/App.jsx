/**
 * UrbanNest AI — App Root
 * Router, Navbar, and GlobalProvider wrapping all pages.
 */
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { GlobalProvider, useGlobal } from './hooks/useGlobal.jsx';
import Home      from './pages/Home.jsx';
import Search    from './pages/Search.jsx';
import Map       from './pages/Map.jsx';
import Advisor   from './pages/Advisor.jsx';
import Predict   from './pages/Predict.jsx';
import Market    from './pages/Market.jsx';
import Favorites from './pages/Favorites.jsx';
import Alerts    from './pages/Alerts.jsx';

function Navbar() {
  const { country, city, cities, changeCountry, changeCity } = useGlobal();
  const location = useLocation();
  const navigate = useNavigate();
  const active   = (p) => location.pathname === p;

  const navLink = (to, label, icon) => (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '6px 10px', borderRadius: 7, fontSize: 13, fontWeight: 500,
      color: active(to) ? '#1B4FD8' : '#374151',
      background: active(to) ? 'rgba(27,79,216,0.08)' : 'transparent',
      textDecoration: 'none', whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 12 }}>{icon}</span>{label}
    </Link>
  );

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 500,
      background: '#fff', borderBottom: '1px solid #E5E7EB',
      display: 'flex', alignItems: 'center', padding: '0 16px', height: 56, gap: 6,
    }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7, marginRight: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>🏘️</span>
        <span style={{ fontWeight: 900, fontSize: 15, color: '#0F172A' }}>
          UrbanNest<span style={{ color: '#1B4FD8' }}> AI</span>
        </span>
      </Link>

      <select value={country} onChange={e => { changeCountry(e.target.value); navigate('/'); }}
        style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: 12,
          background: '#F9FAFB', color: '#374151', outline: 'none', cursor: 'pointer', flexShrink: 0 }}>
        <option value="uk">🇬🇧 UK</option>
        <option value="india">🇮🇳 India</option>
      </select>

      <select value={city || ''} onChange={e => changeCity(e.target.value)}
        style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: 12,
          background: '#F9FAFB', color: '#374151', outline: 'none', cursor: 'pointer',
          maxWidth: 130, flexShrink: 0 }}>
        {cities.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <div style={{ display: 'flex', gap: 1, marginLeft: 4, overflowX: 'auto' }}>
        {navLink('/',          'Home',     '🏠')}
        {navLink('/search',    'Search',   '🔍')}
        {navLink('/map',       'Map',      '🗺️')}
        {navLink('/advisor',   'Advisor',  '🤖')}
        {navLink('/predict',   'Price AI', '◇')}
        {navLink('/market',    'Market',   '△')}
        {navLink('/favorites', 'Saved',    '❤️')}
        {navLink('/alerts',    'Alerts',   '🔔')}
      </div>

      <div style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>
        {country === 'india' ? '₹ INR' : '£ GBP'}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <GlobalProvider>
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            <Route path="/"          element={<Home />}      />
            <Route path="/search"    element={<Search />}    />
            <Route path="/map"       element={<Map />}       />
            <Route path="/advisor"   element={<Advisor />}   />
            <Route path="/predict"   element={<Predict />}   />
            <Route path="/market"    element={<Market />}    />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/alerts"    element={<Alerts />}    />
            <Route path="*"          element={<NotFound />}  />
          </Routes>
        </main>
      </BrowserRouter>
    </GlobalProvider>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: 64, marginBottom: 14, color: '#E5E7EB' }}>404</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Page not found</div>
      <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>This page doesn't exist.</div>
      <button onClick={() => navigate('/')} style={{
        padding: '10px 24px', borderRadius: 9, background: '#1B4FD8',
        color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
      }}>Go Home</button>
    </div>
  );
}
