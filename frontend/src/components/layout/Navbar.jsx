import { C, T } from '../../utils/design.js';

const tabs = [
  { id: 'search', label: '🔍 Search' },
  { id: 'map', label: '🗺 Map' },
  { id: 'advisor', label: '🤖 AI Advisor' },
  { id: 'predict', label: '📈 Price Predict' },
  { id: 'market', label: '📊 Market' },
];

export default function Navbar({ page, setPage }) {
  return (
    <div style={{
      background: '#0d0e14',
      borderBottom: `1px solid ${C.border}`,
      padding: '0 12px',
      display: 'flex',
      alignItems: 'center',
      overflowX: 'auto',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div
        onClick={() => setPage('search')}
        style={{ fontSize: 15, fontWeight: 900, color: C.text, padding: '13px 16px 13px 4px', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, fontFamily: T.display }}
      >
        🏡 UrbanNest
      </div>
      {tabs.map(t => (
        <div
          key={t.id}
          onClick={() => setPage(t.id)}
          style={{
            padding: '14px 18px',
            fontSize: 13,
            fontWeight: 600,
            color: page === t.id ? '#4285f4' : '#4a5568',
            cursor: 'pointer',
            borderBottom: page === t.id ? '2px solid #4285f4' : '2px solid transparent',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {t.label}
        </div>
      ))}
      <div style={{ marginLeft: 'auto', flexShrink: 0, padding: '0 8px' }}>
        <span style={{
          background: 'linear-gradient(135deg,#4285f4,#34a853)',
          color: '#fff',
          padding: '3px 10px',
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
        }}>✦ Gemini</span>
      </div>
    </div>
  );
}
