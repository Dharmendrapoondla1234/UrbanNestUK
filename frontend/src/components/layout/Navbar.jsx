import { useState } from 'react';
import { C, T, btn } from '../../utils/design.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useGlobal } from '../../hooks/useGlobal.jsx';
import AuthModal from './AuthModal.jsx';

export default function Navbar({ page, setPage }) {
  const { user, signOut } = useAuth();
  const { country, city, cities, citiesLoading, changeCountry, setCity, supportedCountries } = useGlobal();
  const [showAuth, setShowAuth] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: '⌂' },
    { id: 'search', label: 'Search', icon: '⊙' },
    { id: 'map', label: 'Map', icon: '◈' },
  ];
  const aiItems = user ? [
    { id: 'advisor', label: 'Advisor', icon: '◎' },
    { id: 'predict', label: 'Price AI', icon: '◇' },
    { id: 'market', label: 'Market', icon: '△' },
  ] : [];

  const selStyle = {
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontSize: 12, fontFamily: T.body,
    outline: 'none', cursor: 'pointer', padding: '5px 8px',
  };

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(7,9,16,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 20px', height: 58, gap: 6,
      }}>
        {/* Logo */}
        <button onClick={() => setPage('home')} style={{
          display: 'flex', alignItems: 'center', gap: 9,
          background: 'none', border: 'none', cursor: 'pointer', padding: '0 10px 0 0', flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg,#4f9eff,#818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 0 18px rgba(79,158,255,0.35)',
          }}>🏙️</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: T.display, fontSize: 14, fontWeight: 900, color: C.text, lineHeight: 1.1, letterSpacing: '-0.3px' }}>UrbanNest</div>
            <div style={{ fontSize: 8, color: C.muted, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>GLOBAL AI</div>
          </div>
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: C.border, margin: '0 6px' }} />

        {/* Country + City selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: C.dim }}>🌍</span>
          <select style={selStyle} value={country} onChange={e => changeCountry(e.target.value)}>
            {supportedCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            style={{ ...selStyle, minWidth: 110 }}
            value={city}
            onChange={e => setCity(e.target.value)}
            disabled={citiesLoading}
          >
            {citiesLoading
              ? <option>Loading…</option>
              : cities.map(c => <option key={c} value={c}>{c}</option>)
            }
          </select>
        </div>

        <div style={{ width: 1, height: 24, background: C.border, margin: '0 4px' }} />

        {/* Nav */}
        <div style={{ display: 'flex', gap: 2 }}>
          {[...navItems, ...aiItems].map(item => {
            const active = page === item.id;
            const isAI = ['advisor','predict','market'].includes(item.id);
            return (
              <button key={item.id} onClick={() => setPage(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? (isAI ? 'rgba(167,139,250,0.15)' : 'rgba(79,158,255,0.15)') : 'transparent',
                color: active ? (isAI ? C.purple : C.blue) : C.muted,
                fontSize: 12, fontWeight: 600, fontFamily: T.body, transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 13 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Auth */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg,#4f9eff,#818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 900, color: '#fff',
            }}>{user.name[0].toUpperCase()}</div>
            <span style={{ fontSize: 12, color: C.muted }}>{user.name}</span>
            <button onClick={signOut} style={{ ...btn('ghost', 'sm'), fontSize: 11 }}>Sign Out</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAuth(true)} style={{ ...btn('ghost', 'sm') }}>Sign In</button>
            <button onClick={() => setShowAuth(true)} style={{ ...btn('primary', 'sm') }}>Get Started</button>
          </div>
        )}
      </nav>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
