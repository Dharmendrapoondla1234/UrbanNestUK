import { useState } from 'react';
import { C, T, btn, UK_CITIES } from '../utils/design.js';
import { getAIAdvisor } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

const STARTER_QUESTIONS = [
  'What are the best areas in London for first-time buyers under £400k?',
  'Should I buy in Manchester or Leeds for rental yield?',
  'What stamp duty will I pay on a £600,000 property?',
  'Which UK cities have the highest property growth potential?',
  'What are the pros and cons of leasehold vs freehold in the UK?',
  'How do I find a good buy-to-let investment in Edinburgh?',
];

export default function Advisor() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'m your AI property advisor for the UK market. I can help with area recommendations, investment analysis, price guidance, stamp duty, and much more. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendMessage(text) {
    const q = text || input.trim();
    if (!q) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const reply = await getAIAdvisor(q, city);
      setMessages(m => [...m, { role: 'assistant', text: reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', text: 'Sorry, I\'m unable to respond right now. Please ensure VITE_GEMINI_KEY is configured and try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return <AuthGate />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', maxWidth: 860, margin: '0 auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ padding: '24px 0 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: T.display, fontSize: 26, fontWeight: 900, color: C.text, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
              🤖 AI Property Advisor
            </h1>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Powered by Gemini — UK property expertise at your fingertips</p>
          </div>
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            style={{
              padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.text, fontSize: 13, fontFamily: T.body, outline: 'none',
            }}
          >
            <option value="">All UK</option>
            {UK_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#3b8cf8,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, marginRight: 10, marginTop: 4,
              }}>🤖</div>
            )}
            <div style={{
              maxWidth: '80%',
              background: m.role === 'user'
                ? 'linear-gradient(135deg,#3b8cf8,#8b5cf6)'
                : C.surface,
              border: m.role === 'user' ? 'none' : `1px solid ${C.border}`,
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '12px 16px',
              fontSize: 14, lineHeight: 1.65, color: C.text,
              whiteSpace: 'pre-wrap',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#3b8cf8,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>🤖</div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px 16px 16px 4px', padding: '12px 16px' }}>
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      {/* Starter questions */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 0 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Suggested questions</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STARTER_QUESTIONS.map(q => (
              <button key={q} onClick={() => sendMessage(q)} style={{
                padding: '7px 12px', background: 'rgba(59,140,248,0.08)',
                border: '1px solid rgba(59,140,248,0.2)', borderRadius: 99,
                fontSize: 12, color: C.muted, cursor: 'pointer', fontFamily: T.body,
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = 'rgba(59,140,248,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = 'rgba(59,140,248,0.08)'; }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 0 20px', display: 'flex', gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask about UK property…"
          disabled={loading}
          style={{
            flex: 1, padding: '12px 16px',
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, color: C.text, fontSize: 14,
            fontFamily: T.body, outline: 'none',
            opacity: loading ? 0.6 : 1,
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            ...btn('primary', 'md'),
            background: 'linear-gradient(135deg,#3b8cf8,#8b5cf6)',
            opacity: loading || !input.trim() ? 0.5 : 1,
            padding: '12px 20px',
          }}
        >
          Send →
        </button>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: C.muted,
          animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}

function AuthGate() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)', gap: 16 }}>
      <div style={{ fontSize: 52 }}>🤖</div>
      <h2 style={{ fontFamily: T.display, fontSize: 22, fontWeight: 900, color: C.text, margin: 0 }}>Sign in to access AI Advisor</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Get personalised UK property guidance powered by Gemini AI</p>
    </div>
  );
}
