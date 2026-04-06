import { useState, useEffect, useRef } from 'react';
import { callGeminiChat } from '../services/gemini.js';
import { COUNTRIES, GeminiBadge } from '../components/ui.jsx';
import { C } from '../utils/design.js';

export default function Advisor() {
  const [msgs, setMsgs] = useState([
    { role: 'model', content: "Hello! I'm your AI property advisor powered by Gemini. I can help with area recommendations, investment analysis, stamp duty, mortgages, rental yields, neighbourhood insights, and much more — across global markets. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState('United Kingdom');
  const endRef = useRef(null);

  const quickQs = [
    'Best areas in London under £400k?',
    'Stamp duty on a £650,000 property?',
    'Manchester vs Birmingham for investment?',
    'Average rental yield in Edinburgh?',
    'Should I buy now or wait in 2025?',
    'How to buy property as a foreigner in UAE?',
  ];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const inputStyle = { background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f2f8', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', flex: 1, outline: 'none' };
  const selectStyle = { ...inputStyle, flex: 'none', width: 160 };

  async function send(text) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    const updatedMsgs = [...msgs, { role: 'user', content: msg }];
    setMsgs(updatedMsgs);
    setLoading(true);
    try {
      const history = updatedMsgs.map(m => ({ role: m.role, parts: [{ text: m.content }] }));
      const sys = `You are an expert property advisor specialising in ${region} real estate with deep knowledge of global markets. Cover: prices, stamp duty, mortgages, rental yields, investment strategies, area analysis, legalities. Be specific, accurate, conversational. Use correct currency (£ UK, $ US/AUS, € Europe).`;
      const reply = await callGeminiChat(history, sys, 1200);
      setMsgs(m => [...m, { role: 'model', content: reply }]);
    } catch (e) {
      setMsgs(m => [...m, { role: 'model', content: '⚠ Error: ' + e.message }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 50px)', maxWidth: 820, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ padding: '14px 0', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#f0f2f8' }}>🤖 AI Property Advisor</span>
            <GeminiBadge />
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Expert property advice, area insights & investment analysis</div>
        </div>
        <select value={region} onChange={e => setRegion(e.target.value)} style={selectStyle}>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              background: m.role === 'user' ? 'linear-gradient(135deg,#4285f4,#34a853)' : '#1a1d26',
              color: '#f0f2f8',
              border: m.role === 'user' ? 'none' : `1px solid ${C.border}`,
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '11px 15px', fontSize: 13, maxWidth: '84%', lineHeight: 1.75, whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: '#1a1d26', border: `1px solid ${C.border}`, borderRadius: '16px 16px 16px 4px', padding: '11px 15px', display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, background: '#4285f4', borderRadius: '50%', animation: `dot 1.2s infinite ${i*0.2}s` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {msgs.length <= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, paddingBottom: 10 }}>
          {quickQs.map((q, i) => (
            <button key={i} onClick={() => send(q)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '10px 0', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about property markets, prices, investment..."
          style={inputStyle}
          onKeyDown={e => e.key === 'Enter' && !loading && send()}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{ background: 'linear-gradient(135deg,#4285f4,#34a853)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: (loading || !input.trim()) ? 0.5 : 1 }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
