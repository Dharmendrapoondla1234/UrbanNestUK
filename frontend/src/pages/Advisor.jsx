import { useState, useRef, useEffect } from 'react';
import { C, T, btn } from '../utils/design.js';
import { getAdvisorResponse, GeminiError } from '../services/gemini.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useGlobal } from '../hooks/useGlobal.jsx';

const STARTERS = [
  'What are the best areas in London for first-time buyers under £400k?',
  'Should I buy or rent in Manchester right now?',
  'How much stamp duty on a £650,000 property in England?',
  'Which UK cities have the highest rental yields in 2025?',
  'What is leasehold vs freehold and which is better?',
  'Is now a good time to invest in UK property?',
  'How do I find the best buy-to-let investment?',
  'What checks should I do before buying a property?',
];

export default function Advisor() {
  const { user } = useAuth();
  const { country, city } = useGlobal();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hello! I'm your AI property advisor with expertise in global real estate markets. I can help with area recommendations, investment analysis, price guidance, legal processes, financing, and much more.\n\nCurrently focused on: ${country}${city ? ` · ${city}` : ''}.\n\nWhat would you like to know?` }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  async function send(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setError(null);
    const newMessages = [...messages, { role: 'user', text: q }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const reply = await getAdvisorResponse(newMessages, { country, city });
      setMessages(m => [...m, { role: 'assistant', text: reply }]);
    } catch (e) {
      const isGeminiErr = e instanceof GeminiError;
      setError({
        code: isGeminiErr ? e.code : 'UNKNOWN',
        message: isGeminiErr ? e.message : `Unexpected error: ${e.message}`,
      });
      setMessages(m => [...m, { role: 'assistant', text: '⚠️ ' + (isGeminiErr ? e.message : 'An unexpected error occurred. Please try again.'), isError: true }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function clearChat() {
    setMessages([{ role: 'assistant', text: `Chat cleared. I'm ready to help with ${country} property questions. What would you like to know?` }]);
    setError(null);
  }

  if (!user) return <AuthGate />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 58px)', maxWidth: 820, margin: '0 auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{
        padding: '18px 0 14px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontFamily: T.display, fontSize: 22, fontWeight: 900, color: C.text, margin: '0 0 3px', letterSpacing: '-0.5px' }}>
            ◎ AI Property Advisor
          </h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.muted }}>Powered by Gemini · {country}</span>
            {city && <span style={{ fontSize: 11, color: C.dim }}>· {city}</span>}
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, animation: 'blink 2s ease infinite' }} />
          </div>
        </div>
        <button onClick={clearChat} style={{ ...btn('ghost', 'sm'), fontSize: 11 }}>Clear Chat</button>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {/* Error banner */}
      {error && error.code === 'API_KEY_MISSING' && (
        <div style={{
          margin: '12px 0 0', padding: '12px 16px', borderRadius: 10, flexShrink: 0,
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 4 }}>⚠️ Gemini API Key Missing</div>
          <div style={{ fontSize: 12, color: C.muted }}>Add <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>VITE_GEMINI_KEY</code> to your environment variables (Vercel → Settings → Environment Variables) and redeploy.</div>
        </div>
      )}
      {error && error.code === 'AUTH_FAILED' && (
        <div style={{
          margin: '12px 0 0', padding: '12px 16px', borderRadius: 10, flexShrink: 0,
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 4 }}>⚠️ Invalid API Key</div>
          <div style={{ fontSize: 12, color: C.muted }}>Your Gemini API key appears invalid. Get a free key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: C.blue }}>aistudio.google.com</a> and update VITE_GEMINI_KEY.</div>
        </div>
      )}
      {error && error.code === 'RATE_LIMITED' && (
        <div style={{ margin: '12px 0 0', padding: '10px 14px', borderRadius: 10, flexShrink: 0, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <div style={{ fontSize: 12, color: C.amber }}>⏳ Rate limited — please wait a moment and try again.</div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 10 }}>
            {m.role === 'assistant' && (
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                background: m.isError ? 'rgba(248,113,113,0.2)' : 'linear-gradient(135deg,#4f9eff,#818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}>◎</div>
            )}
            <div style={{
              maxWidth: '82%',
              background: m.role === 'user'
                ? 'linear-gradient(135deg,#4f9eff,#818cf8)'
                : m.isError ? 'rgba(248,113,113,0.08)' : C.surface,
              border: m.role === 'user' ? 'none'
                : m.isError ? '1px solid rgba(248,113,113,0.25)' : `1px solid ${C.border}`,
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '12px 16px', fontSize: 14, lineHeight: 1.68, color: C.text,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#4f9eff,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>◎</div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px 16px 16px 4px', padding: '14px 18px' }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starters */}
      {messages.length <= 2 && (
        <div style={{ flexShrink: 0, paddingBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
            Try asking…
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STARTERS.map(q => (
              <button key={q} onClick={() => send(q)} disabled={loading} style={{
                padding: '6px 11px', background: 'rgba(79,158,255,0.07)',
                border: '1px solid rgba(79,158,255,0.18)', borderRadius: 99,
                fontSize: 11, color: C.muted, cursor: 'pointer', fontFamily: T.body,
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = 'rgba(79,158,255,0.14)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = 'rgba(79,158,255,0.07)'; }}
              >{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '10px 0 18px', display: 'flex', gap: 9 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={`Ask about property in ${country}…`}
          disabled={loading}
          style={{
            flex: 1, padding: '12px 16px',
            background: C.surface, border: `1px solid ${error ? 'rgba(248,113,113,0.3)' : C.border}`,
            borderRadius: 12, color: C.text, fontSize: 14,
            fontFamily: T.body, outline: 'none', opacity: loading ? 0.7 : 1,
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { if (!error) e.target.style.borderColor = 'rgba(79,158,255,0.5)'; }}
          onBlur={e => { e.target.style.borderColor = error ? 'rgba(248,113,113,0.3)' : C.border; }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            ...btn('primary', 'md'), flexShrink: 0, fontSize: 13,
            opacity: loading || !input.trim() ? 0.5 : 1, padding: '12px 20px',
          }}
        >
          {loading ? '⏳' : 'Send →'}
        </button>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 16 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: C.muted,
          animation: `tdot 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
      <style>{`@keyframes tdot{0%,80%,100%{transform:translateY(0);opacity:0.5}40%{transform:translateY(-5px);opacity:1}}`}</style>
    </div>
  );
}

function AuthGate() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 58px)', gap: 14, padding: 24 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: 'linear-gradient(135deg,#4f9eff,#818cf8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        boxShadow: '0 0 40px rgba(79,158,255,0.3)',
      }}>◎</div>
      <h2 style={{ fontFamily: T.display, fontSize: 22, fontWeight: 900, color: C.text, margin: 0 }}>Sign in for AI Advisor</h2>
      <p style={{ color: C.muted, fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 320 }}>
        Get expert property guidance from our AI advisor, powered by Gemini with global market knowledge.
      </p>
    </div>
  );
}
