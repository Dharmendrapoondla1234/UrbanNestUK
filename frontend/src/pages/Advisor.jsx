/**
 * UrbanNest AI — AI Property Advisor
 * Chat-based advisor for India & UK property questions.
 */
import { useState, useRef, useEffect } from 'react';
import { aiAdvisor } from '../services/api.js';
import { useGlobal } from '../hooks/useGlobal.jsx';

const STARTERS = {
  india: [
    'Which areas in Bangalore are best for IT professionals?',
    'How does RERA protect homebuyers in India?',
    'What is the difference between carpet area and built-up area?',
    'Best areas for investment in Mumbai under ₹1 crore?',
    'How much stamp duty on a ₹60 lakh flat in Pune?',
  ],
  uk: [
    'What UK cities have the highest rental yields in 2025?',
    'How does stamp duty work for first-time buyers?',
    'Should I buy leasehold or freehold in London?',
    'What does EPC rating mean for my energy bills?',
    'Is now a good time to invest in Manchester property?',
  ],
};

export default function Advisor() {
  const { country, city } = useGlobal();
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Reset chat when country changes
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      text: `Hello! I'm your AI property advisor with expertise in ${country === 'india' ? 'Indian' : 'UK'} real estate.\n\nI can help with area recommendations, investment analysis, price guidance, legal processes (${country === 'india' ? 'RERA, stamp duty, registration' : 'SDLT, EPC, freehold/leasehold'}), and much more.\n\nCurrently focused on: ${country === 'india' ? '🇮🇳' : '🇬🇧'} ${country.charAt(0).toUpperCase() + country.slice(1)}${city ? ` · ${city}` : ''}.\n\nWhat would you like to know?`,
    }]);
    setError(null);
  }, [country, city]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setError(null);

    const newMessages = [...messages, { role: 'user', text: q }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const data = await aiAdvisor({ message: q, country, city, history: newMessages.slice(-6) });
      setMessages(m => [...m, { role: 'assistant', text: data.response }]);
    } catch (e) {
      const errText = e.message || 'Something went wrong. Please try again.';
      setError(errText);
      setMessages(m => [...m, { role: 'assistant', text: `⚠️ ${errText}`, isError: true }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const starters = STARTERS[country] || STARTERS.uk;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 58px)', maxWidth: 800, margin: '0 auto', padding: '0 20px',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 0 14px', borderBottom: '1px solid #E5E7EB',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 900, color: '#0F172A' }}>
            ◎ AI Property Advisor
          </h1>
          <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>Powered by Gemini 2.0 Flash · {country === 'india' ? '🇮🇳 India' : '🇬🇧 UK'}</span>
            {city && <span>· {city}</span>}
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          </div>
        </div>
        <button onClick={() => {
          setMessages([{ role: 'assistant', text: `Chat cleared. Ask me anything about ${country} property.` }]);
          setError(null);
        }} style={{
          padding: '6px 12px', borderRadius: 7,
          background: 'transparent', border: '1px solid #E5E7EB',
          fontSize: 12, color: '#6B7280', cursor: 'pointer',
        }}>
          Clear Chat
        </button>
      </div>

      {/* Error banner */}
      {error && error.includes('API_KEY') && (
        <div style={{ margin: '10px 0', padding: '10px 14px', background: '#FEF2F2',
          border: '1px solid #FECACA', borderRadius: 9 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>⚠️ API Key Missing</div>
          <div style={{ fontSize: 12, color: '#374151' }}>
            Add <code>VITE_GEMINI_KEY</code> to your Vercel environment variables and redeploy.
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
            {m.role === 'assistant' && (
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                background: m.isError ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#1B4FD8,#7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff',
              }}>◎</div>
            )}
            <div style={{
              maxWidth: '80%',
              background: m.role === 'user' ? 'linear-gradient(135deg,#1B4FD8,#7C3AED)'
                : m.isError ? '#FEF2F2' : '#F9FAFB',
              color: m.role === 'user' ? '#fff' : m.isError ? '#991B1B' : '#374151',
              border: m.role === 'user' ? 'none' : m.isError ? '1px solid #FECACA' : '1px solid #E5E7EB',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '11px 15px', fontSize: 14, lineHeight: 1.7,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#1B4FD8,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>◎</div>
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '16px 16px 16px 4px', padding: '14px 18px' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
              <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starter questions */}
      {messages.length <= 1 && (
        <div style={{ flexShrink: 0, paddingBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 7 }}>
            Try asking…
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {starters.map(q => (
              <button key={q} onClick={() => send(q)} disabled={loading} style={{
                padding: '5px 10px', borderRadius: 20,
                background: 'rgba(27,79,216,0.06)', border: '1px solid rgba(27,79,216,0.18)',
                fontSize: 11, color: '#374151', cursor: 'pointer',
              }}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div style={{ flexShrink: 0, padding: '10px 0 18px', display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={`Ask about ${country === 'india' ? 'India' : 'UK'} property…`}
          disabled={loading}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 12,
            border: '1.5px solid #E5E7EB', fontSize: 14,
            background: '#F9FAFB', outline: 'none', opacity: loading ? 0.7 : 1,
          }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{
          padding: '12px 20px', borderRadius: 12, background: '#1B4FD8',
          color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
          opacity: (loading || !input.trim()) ? 0.5 : 1,
        }}>
          {loading ? '⏳' : 'Send →'}
        </button>
      </div>
    </div>
  );
}
