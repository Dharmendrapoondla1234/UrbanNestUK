import { useState } from 'react';
import { C, T, btn } from '../../utils/design.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import AuthModal from './AuthModal.jsx';

export default function Navbar({ page, setPage }) {
  const { user, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const navItems = [
    { id: 'home',   label: 'Home',   icon: '🏠' },
    { id: 'search', label: 'Search', icon: '🔍' },
    { id: 'map',    label: 'Map',    icon: '🗺️' },
  ];

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,11,15,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 24px', height: 60, gap: 24,
      }}>
        {/* Logo */}
        <button onClick={() => setPage('home')} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg,#3b8cf8,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, boxShadow: '0 0 20px rgba(59,140,248,0.4)',
          }}>🏙️</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: T.display, fontSize: 15, fontWeight: 900, color: C.text, lineHeight: 1.1 }}>UrbanNest</div>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>UK</div>
          </div>
        </button>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 4 }}>
          {navItems.map(item => {
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(59,140,248,0.15)' : 'transparent',
                color: active ? C.blue : C.muted,
                fontSize: 13, fontWeight: 600, fontFamily: T.body,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>

        {/* AI Features */}
        {user && (
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { id: 'advisor', label: 'Advisor', icon: '🤖' },
              { id: 'predict', label: 'Price AI', icon: '💰' },
              { id: 'market', label: 'Market', icon: '📊' },
            ].map(item => {
              const active = page === item.id;
              return (
                <button key={item.id} onClick={() => setPage(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
                  color: active ? C.purple : C.muted,
                  fontSize: 13, fontWeight: 600, fontFamily: T.body,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Auth */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg,#3b8cf8,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff',
            }}>{user.name[0].toUpperCase()}</div>
            <span style={{ fontSize: 13, color: C.muted }}>{user.name}</span>
            <button onClick={signOut} style={{ ...btn('ghost', 'sm'), fontSize: 12 }}>Sign Out</button>
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
