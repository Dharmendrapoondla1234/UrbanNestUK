/**
 * UrbanNest AI — Alerts Page
 * Create, view, and manage property search alerts.
 * Alerts fire every 30 minutes via the Celery worker.
 */
import { useState, useEffect } from 'react';
import { createAlert, getAlerts, deleteAlert } from '../services/api.js';
import { useGlobal } from '../hooks/useGlobal.jsx';

export default function Alerts() {
  const { country, city, cities } = useGlobal();
  const userId = localStorage.getItem('un_user_id') || 'demo-user';

  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [query, setQuery]         = useState('');
  const [alertCity, setAlertCity] = useState(city || '');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const EXAMPLES = {
    india: ['2BHK under 50L in Bangalore', '3BHK villa in Pune under 1.2Cr', '1BHK near IT park Hyderabad'],
    uk:    ['3-bed house Manchester under £350k', 'flat London under £400k near tube', '2-bed Edinburgh under £250k'],
  };

  useEffect(() => {
    loadAlerts();
  }, [userId]); // eslint-disable-line

  async function loadAlerts() {
    try {
      const data = await getAlerts(userId);
      setAlerts(data.alerts || []);
    } catch { setAlerts([]); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setCreating(true); setError(''); setSuccess('');
    try {
      await createAlert({ query, country, city: alertCity, userId });
      setSuccess(`Alert created: "${query}"`);
      setQuery(''); setAlertCity(city || '');
      loadAlerts();
    } catch (e) {
      setError(e.message);
    } finally { setCreating(false); }
  }

  async function handleDelete(alertId) {
    try {
      await deleteAlert(alertId, userId);
      setAlerts(a => a.filter(al => al.id !== alertId));
    } catch { /* ignore */ }
  }

  const examples = EXAMPLES[country] || EXAMPLES.uk;

  return (
    <div style={{ padding: '24px', maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', margin: '0 0 6px' }}>
        🔔 Property Alerts
      </h1>
      <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 24px' }}>
        Get notified when new properties matching your criteria are added. Alerts check every 30 minutes.
      </p>

      {/* Create alert form */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>Create New Alert</h2>
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>
              SEARCH QUERY (NATURAL LANGUAGE)
            </label>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={examples[0]}
              style={{
                width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13,
                background: '#F9FAFB', outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
            {examples.map(ex => (
              <button type="button" key={ex} onClick={() => setQuery(ex)} style={{
                padding: '3px 9px', borderRadius: 20, fontSize: 11,
                background: 'rgba(27,79,216,0.07)', border: '1px solid rgba(27,79,216,0.2)',
                color: '#1B4FD8', cursor: 'pointer',
              }}>{ex}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>CITY (OPTIONAL)</label>
              <select value={alertCity} onChange={e => setAlertCity(e.target.value)} style={{
                width: '100%', padding: '9px 10px', border: '1px solid #E5E7EB',
                borderRadius: 8, fontSize: 13, background: '#F9FAFB', outline: 'none',
              }}>
                <option value="">Any city</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {error && <div style={{ color: '#DC2626', fontSize: 12, marginBottom: 10 }}>⚠️ {error}</div>}
          {success && <div style={{ color: '#059669', fontSize: 12, marginBottom: 10 }}>✅ {success}</div>}

          <button type="submit" disabled={creating || !query.trim()} style={{
            padding: '10px 20px', background: '#1B4FD8', color: '#fff',
            border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13,
            cursor: 'pointer', opacity: (creating || !query.trim()) ? 0.6 : 1,
          }}>
            {creating ? '⏳ Creating…' : '+ Create Alert'}
          </button>
        </form>
      </div>

      {/* Alert list */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 12px' }}>
        Active Alerts ({alerts.length})
      </h2>

      {loading ? (
        <div style={{ color: '#6B7280', fontSize: 13 }}>Loading…</div>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280', fontSize: 13 }}>
          No alerts yet. Create one above to get notified about new listings.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map(a => (
            <div key={a.id} style={{
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                  "{a.query}"
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{
                    padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                    background: a.is_active ? '#ECFDF5' : '#F9FAFB',
                    color: a.is_active ? '#059669' : '#6B7280',
                    border: `1px solid ${a.is_active ? '#A7F3D0' : '#E5E7EB'}`,
                  }}>
                    {a.is_active ? '● Active' : '○ Paused'}
                  </span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {a.match_count || 0} matches found
                  </span>
                </div>
              </div>
              <button onClick={() => handleDelete(a.id)} style={{
                padding: '5px 10px', borderRadius: 7,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#DC2626', fontSize: 11, cursor: 'pointer',
              }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
