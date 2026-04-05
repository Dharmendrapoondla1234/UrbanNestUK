import { C, T, badge, fmt, fmtK } from '../../utils/design.js';

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',  icon: '⚡' },
  { id: 'leads',      label: 'Leads',      icon: '🎯' },
  { id: 'contacts',   label: 'Contacts',   icon: '👥' },
  { id: 'pipeline',   label: 'Pipeline',   icon: '🏗️' },
  { id: 'tasks',      label: 'Tasks',      icon: '✅' },
  { id: 'analytics',  label: 'Analytics',  icon: '📊' },
];

const PROPAI_URL = import.meta.env.VITE_PROPAI_URL || 'http://localhost:3000';

export default function Layout({ page, setPage, children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: T.body }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, background: C.surface,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg,#3b8cf8,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
              boxShadow: '0 0 16px rgba(59,140,248,0.35)', flexShrink: 0,
            }}>🏢</div>
            <div>
              <div style={{ fontFamily: T.display, fontSize: 15, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>PropAI</div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: '0.5px' }}>CRM PLATFORM</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', padding: '0 8px', marginBottom: 8 }}>Menu</div>
          {NAV_ITEMS.map(item => {
            const active = page === item.id;
            return (
              <button key={item.id}
                onClick={() => setPage(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  marginBottom: 2, fontFamily: T.body, fontSize: 13, fontWeight: active ? 700 : 500,
                  background: active ? 'rgba(59,140,248,0.12)' : 'transparent',
                  color: active ? '#3b8cf8' : C.muted,
                  borderLeft: active ? '2px solid #3b8cf8' : '2px solid transparent',
                  transition: 'all 0.15s', textAlign: 'left',
                }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}

          <div style={{ height: 1, background: C.border, margin: '14px 8px' }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', padding: '0 8px', marginBottom: 8 }}>Tools</div>

          <a href={PROPAI_URL} target="_blank" rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 9, textDecoration: 'none',
              fontSize: 13, fontWeight: 500, color: C.muted,
              background: 'transparent', transition: 'all 0.15s',
              borderLeft: '2px solid transparent',
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.muted}>
            <span style={{ fontSize: 16 }}>🏠</span>PropAI UK ↗
          </a>
        </nav>

        {/* User badge */}
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#3b8cf8,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff',
            }}>A</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Agent</div>
              <div style={{ fontSize: 11, color: C.muted }}>Senior Negotiator</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}

// ── Reusable page header ─────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      marginBottom: 28, flexWrap: 'wrap', gap: 14,
    }}>
      <div>
        <h1 style={{ fontFamily: T.display, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ color: C.muted, fontSize: 13, marginTop: 5 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Modal wrapper ────────────────────────────────────────────
export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.surface, border: `1px solid rgba(59,140,248,0.2)`,
        borderRadius: 16, padding: 28, width: '100%',
        maxWidth: wide ? 720 : 520, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontFamily: T.display, fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer', padding: '2px 6px' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────
export function Empty({ icon, message, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.muted, marginBottom: 6 }}>{message}</div>
      {sub && <div style={{ fontSize: 13, color: C.dim }}>{sub}</div>}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────
export function StatCard({ icon, value, label, sub, color, trend }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: '18px 20px',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 26 }}>{icon}</div>
        {trend && <span style={{ fontSize: 11, fontWeight: 700, color: trend > 0 ? '#22c55e' : '#ef4444' }}>{trend > 0 ? '↑' : '↓'}{Math.abs(trend)}%</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: color || C.text, letterSpacing: '-1px', fontFamily: T.display }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Loading spinner ──────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: `3px solid ${C.dim}`,
        borderTopColor: C.blue,
        animation: 'spin 0.8s linear infinite',
      }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────────
export function Avatar({ name, size = 32 }) {
  const ini = initials(name);
  const colors = ['#3b8cf8','#6366f1','#9333ea','#14b8a6','#22c55e','#f59e0b'];
  const col = colors[ini.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg,${col},${col}88)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: '#fff', fontFamily: T.display,
    }}>{ini}</div>
  );
}

function initials(name) {
  return (name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
