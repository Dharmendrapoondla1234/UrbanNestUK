import { useState } from 'react';
import { C, T, btn } from '../../utils/design.js';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function AuthModal({ onClose }) {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  function handleSubmit() {
    if (!name.trim() || !email.trim()) return;
    signIn(name.trim(), email.trim());
    onClose();
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.border}`,
    borderRadius: 9, color: C.text,
    fontSize: 14, fontFamily: T.body,
    outline: 'none', boxSizing: 'border-box',
  };

  const features = [
    { icon: '🤖', text: 'AI Property Advisor' },
    { icon: '💰', text: 'Price Prediction Engine' },
    { icon: '📊', text: 'Market Analysis Reports' },
    { icon: '🗺️', text: 'Interactive Map Search' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.surface, border: `1px solid rgba(59,140,248,0.2)`,
        borderRadius: 20, padding: 36, width: '100%', maxWidth: 440,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg,#3b8cf8,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, margin: '0 auto 14px',
            boxShadow: '0 0 30px rgba(59,140,248,0.4)',
          }}>🏙️</div>
          <h2 style={{ fontFamily: T.display, fontSize: 22, fontWeight: 900, color: C.text, margin: '0 0 6px' }}>Sign In to UrbanNest</h2>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Unlock AI-powered features for your property search</p>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
          {features.map(f => (
            <span key={f.text} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 99,
              background: 'rgba(59,140,248,0.1)',
              border: '1px solid rgba(59,140,248,0.2)',
              fontSize: 12, color: C.muted, fontWeight: 600,
            }}>
              {f.icon} {f.text}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            style={inputStyle}
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            style={inputStyle}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <button onClick={handleSubmit} style={{
            ...btn('primary', 'lg'),
            width: '100%', justifyContent: 'center',
            background: 'linear-gradient(135deg,#3b8cf8,#8b5cf6)',
            marginTop: 4,
          }}>
            Get Started Free →
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.dim, marginTop: 14 }}>
          No payment required. Full access to all AI features.
        </p>
      </div>
    </div>
  );
}
