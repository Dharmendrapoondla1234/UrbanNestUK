/**
 * UrbanNest AI — Favorites Page
 * View and manage saved properties.
 */
import { useState, useEffect } from 'react';
import { getFavorites, removeFavorite, fmtPrice } from '../services/api.js';
import { useGlobal } from '../hooks/useGlobal.jsx';

export default function Favorites() {
  const { country, symbol } = useGlobal();
  const userId = localStorage.getItem('un_user_id') || 'demo-user';

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [removing, setRemoving]   = useState(null);

  useEffect(() => {
    getFavorites(userId)
      .then(d => setFavorites(d.items || []))
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleRemove(propertyId) {
    setRemoving(propertyId);
    try {
      await removeFavorite(propertyId, userId);
      setFavorites(f => f.filter(p => p.id !== propertyId));
    } catch { /* ignore */ }
    finally { setRemoving(null); }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: '#6B7280' }}>
        Loading favorites…
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 5px', fontSize: 26, fontWeight: 900, color: '#0F172A' }}>
          ❤️ Saved Properties
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
          {favorites.length} saved {favorites.length === 1 ? 'property' : 'properties'}
        </p>
      </div>

      {favorites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🤍</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#374151' }}>No saved properties yet</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            Click the heart icon on any property to save it here
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 18 }}>
          {favorites.map(p => {
            const imgs = (p.images || []).map(i => typeof i === 'string' ? i : i?.url).filter(Boolean);
            const img  = imgs[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=70';
            return (
              <div key={p.id} style={{
                background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden',
              }}>
                <div style={{ position: 'relative', height: 185 }}>
                  <img src={img} alt={p.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=70'; }}
                  />
                  <button
                    onClick={() => handleRemove(p.id)}
                    disabled={removing === p.id}
                    style={{
                      position: 'absolute', top: 8, right: 8, padding: '4px 10px',
                      borderRadius: 7, background: 'rgba(239,68,68,0.9)',
                      border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer',
                      fontWeight: 600, opacity: removing === p.id ? 0.6 : 1,
                    }}
                  >
                    {removing === p.id ? '…' : '✕ Remove'}
                  </button>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginBottom: 3 }}>
                    {p.price_display || fmtPrice(p.price ? p.price / 100 : 0, p.country || country)}
                  </div>
                  <div style={{ fontSize: 12, color: '#374151', marginBottom: 5,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>📍 {p.area}, {p.city}</span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {p.bedrooms  != null && <span style={{ fontSize: 10, color: '#374151' }}>🛏 {p.bedrooms}</span>}
                      {p.area_sqft != null && <span style={{ fontSize: 10, color: '#374151' }}>{p.area_sqft}ft²</span>}
                    </div>
                  </div>
                  {p.saved_at && (
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>
                      Saved {new Date(p.saved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                  {p.notes && (
                    <div style={{ fontSize: 11, color: '#374151', marginTop: 5,
                      background: '#F9FAFB', borderRadius: 6, padding: '5px 8px' }}>
                      📝 {p.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
