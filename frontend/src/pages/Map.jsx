import { useState, useEffect, useRef } from 'react';
import { C, T, fmt, btn } from '../utils/design.js';
import { searchProperties, getCurrency } from '../services/api.js';
import { getMapAreaSuggestions, generateAreasForCity } from '../services/gemini.js';
import { useGlobal } from '../hooks/useGlobal.jsx';
import PropertyDetail from '../components/property/PropertyDetail.jsx';

const CITY_CENTERS = {
  London:     { lat: 51.5074, lng: -0.1278 },
  Manchester: { lat: 53.4808, lng: -2.2426 },
  Birmingham: { lat: 52.4862, lng: -1.8904 },
  Leeds:      { lat: 53.8008, lng: -1.5491 },
  Edinburgh:  { lat: 55.9533, lng: -3.1883 },
  Bristol:    { lat: 51.4545, lng: -2.5879 },
  Liverpool:  { lat: 53.4084, lng: -2.9916 },
  Oxford:     { lat: 51.7520, lng: -1.2577 },
  // Fallback
  default:    { lat: 51.5074, lng: -0.1278 },
};

export default function MapPage() {
  const { country, city: globalCity, cities } = useGlobal();
  const { symbol } = getCurrency(country);
  const [city, setCity]           = useState(globalCity || 'London');
  const [properties, setProperties] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [hovered, setHovered]     = useState(null);
  const [pin, setPin]             = useState(null); // { lat, lng }
  const [pinInfo, setPinInfo]     = useState(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinProperties, setPinProperties] = useState([]);
  const [userIntent, setUserIntent] = useState('');
  const [areaRecs, setAreaRecs]   = useState([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [viewMode, setViewMode]   = useState('all'); // all | pin
  const svgRef = useRef(null);

  const center = CITY_CENTERS[city] || CITY_CENTERS.default;
  const W = 800, H = 520;
  const SCALE = 2200;

  function toXY(lat, lng) {
    const x = (lng - center.lng) * SCALE + W / 2;
    const y = (center.lat - lat) * SCALE + H / 2;
    return { x, y };
  }
  function fromXY(x, y) {
    const lat = center.lat - (y - H / 2) / SCALE;
    const lng = center.lng + (x - W / 2) / SCALE;
    return { lat, lng };
  }

  // Load city properties
  useEffect(() => {
    setLoading(true);
    setPin(null);
    setPinInfo(null);
    setPinProperties([]);
    setViewMode('all');
    searchProperties({ city, limit: 60 })
      .then(d => setProperties(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [city]);

  // Get AI area recommendations
  useEffect(() => {
    if (!userIntent) return;
    const timer = setTimeout(async () => {
      setAreaLoading(true);
      const areas = await generateAreasForCity(city, country);
      setAreaRecs(areas.slice(0, 6));
      setAreaLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [userIntent, city, country]);

  async function handleMapClick(e) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) * (W / rect.width);
    const rawY = (e.clientY - rect.top) * (H / rect.height);
    const { lat, lng } = fromXY(rawX, rawY);

    setPin({ lat, lng, x: rawX, y: rawY });
    setViewMode('pin');
    setPinLoading(true);
    setPinInfo(null);
    setPinProperties([]);

    try {
      // Parallel: AI info + nearby properties
      const [info, nearby] = await Promise.all([
        getMapAreaSuggestions(lat, lng, userIntent),
        searchProperties({ city, limit: 8 })
          .then(d => {
            // Filter by proximity (rough)
            return (d.items || []).filter(p => {
              if (!p.lat || !p.lng) return false;
              const dist = Math.sqrt((p.lat - lat) ** 2 + (p.lng - lng) ** 2);
              return dist < 0.05; // ~3-4km
            }).slice(0, 6);
          })
      ]);
      setPinInfo(info);
      setPinProperties(nearby.length > 0 ? nearby : properties.slice(0, 4));
    } finally {
      setPinLoading(false);
    }
  }

  function clearPin() {
    setPin(null);
    setPinInfo(null);
    setPinProperties([]);
    setViewMode('all');
  }

  function openNavigate(p) {
    const q = p.lat && p.lng ? `${p.lat},${p.lng}` : encodeURIComponent(p.address || p.title);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, '_blank');
  }
  function openPinNavigate() {
    if (!pin) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`, '_blank');
  }

  const displayProps = viewMode === 'pin' ? pinProperties : properties;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 58px)', overflow: 'hidden', background: C.bg }}>
      {/* Left sidebar */}
      <div style={{
        width: 340, flexShrink: 0, background: C.surface,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Controls */}
        <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontFamily: T.display, fontSize: 16, fontWeight: 900, color: C.text, margin: 0 }}>◈ Map Search</h2>
            {pin && (
              <button onClick={clearPin} style={{ ...btn('danger', 'sm'), fontSize: 11 }}>✕ Clear Pin</button>
            )}
          </div>

          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            style={{
              width: '100%', padding: '8px 11px', marginBottom: 9,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
              borderRadius: 9, color: C.text, fontSize: 13, fontFamily: T.body, outline: 'none',
            }}
          >
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <input
            placeholder="🤖 AI intent: 'family home near good schools'…"
            value={userIntent}
            onChange={e => setUserIntent(e.target.value)}
            style={{
              width: '100%', padding: '8px 11px', boxSizing: 'border-box',
              background: 'rgba(79,158,255,0.06)', border: '1px solid rgba(79,158,255,0.2)',
              borderRadius: 9, color: C.text, fontSize: 12, fontFamily: T.body, outline: 'none',
            }}
          />

          {areaLoading && <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>🤖 AI suggesting areas…</div>}
          {areaRecs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
              {areaRecs.map(a => (
                <button key={a} onClick={() => setCity(city)} style={{
                  padding: '3px 9px', borderRadius: 99,
                  background: 'rgba(79,158,255,0.1)', border: '1px solid rgba(79,158,255,0.2)',
                  fontSize: 10, color: C.blue, cursor: 'pointer', fontFamily: T.body, fontWeight: 600,
                }}>
                  {a}
                </button>
              ))}
            </div>
          )}

          <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
            {pin
              ? '📍 Pin placed — showing nearby properties'
              : `${loading ? 'Loading…' : `${properties.length} properties`} · Click map to drop pin`}
          </div>
        </div>

        {/* Pin info card */}
        {pin && (
          <div style={{
            margin: '10px 12px', padding: 12,
            background: 'linear-gradient(135deg,rgba(45,212,191,0.1),rgba(34,211,238,0.08))',
            border: '1px solid rgba(45,212,191,0.2)', borderRadius: 12, flexShrink: 0,
          }}>
            {pinLoading ? (
              <div style={{ fontSize: 12, color: C.muted }}>🤖 Analysing location…</div>
            ) : pinInfo ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: T.display }}>{pinInfo.area_name}</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 7 }}>{pinInfo.city}</div>
                {pinInfo.facts?.map((f, i) => (
                  <div key={i} style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>• {f}</div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                  <span style={{ fontSize: 11, color: C.teal }}>Investment: {pinInfo.investment_score}/10</span>
                  <button onClick={openPinNavigate} style={{ ...btn('teal', 'sm'), fontSize: 10, padding: '4px 10px' }}>🧭 Navigate</button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Property list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px 12px' }}>
          {pinLoading && viewMode === 'pin' ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: C.dim }}>Finding nearby properties…</div>
          ) : displayProps.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: C.dim }}>No properties in this area</div>
          ) : (
            displayProps.map(p => {
              const isHov = hovered?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  onMouseEnter={() => setHovered(p)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: isHov ? 'rgba(79,158,255,0.08)' : C.card,
                    border: `1px solid ${isHov ? 'rgba(79,158,255,0.35)' : C.border}`,
                    borderRadius: 10, padding: 10, marginBottom: 8, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', gap: 9 }}>
                    <img
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&q=60'}
                      alt=""
                      style={{ width: 68, height: 52, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }}
                      onError={e => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&q=60'; }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: T.display }}>{fmt(p.price, symbol)}</div>
                      <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{p.title}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: C.dim }}>📍 {p.area}</span>
                        <button onClick={e => { e.stopPropagation(); openNavigate(p); }} style={{
                          fontSize: 9, padding: '2px 7px', borderRadius: 6,
                          background: 'rgba(79,158,255,0.1)', border: '1px solid rgba(79,158,255,0.2)',
                          color: C.blue, cursor: 'pointer', fontFamily: T.body, fontWeight: 700,
                        }}>Navigate</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SVG Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0d1117', cursor: 'crosshair' }}>
        <svg
          ref={svgRef}
          width="100%" height="100%"
          viewBox={`0 0 ${W} ${H}`}
          onClick={handleMapClick}
          style={{ display: 'block' }}
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
            </pattern>
            <radialGradient id="centerGlow" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(79,158,255,0.06)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="#0d1117" />
          <rect width={W} height={H} fill="url(#grid)" />
          <ellipse cx={W/2} cy={H/2} rx={W*0.6} ry={H*0.6} fill="url(#centerGlow)" />

          {/* City label */}
          <text x={W/2} y={32} fill="rgba(255,255,255,0.08)" fontSize={20} fontWeight={900}
            textAnchor="middle" fontFamily="Syne,sans-serif" letterSpacing="-1">{city.toUpperCase()}</text>

          {/* Property markers */}
          {properties.map(p => {
            const { x, y } = toXY(p.lat, p.lng);
            if (x < 0 || x > W || y < 0 || y > H) return null;
            const isHov = hovered?.id === p.id;
            const isFeat = p.featured;
            const r = isHov ? 13 : isFeat ? 9 : 7;
            return (
              <g key={p.id} style={{ cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); setSelected(p); }}
                onMouseEnter={() => setHovered(p)}
                onMouseLeave={() => setHovered(null)}
              >
                {isHov && <circle cx={x} cy={y} r={22} fill="rgba(79,158,255,0.12)" />}
                <circle cx={x} cy={y} r={r}
                  fill={isHov ? '#4f9eff' : isFeat ? '#fbbf24' : 'rgba(79,158,255,0.75)'}
                  stroke={isHov ? '#fff' : isFeat ? 'rgba(251,191,36,0.5)' : 'rgba(79,158,255,0.3)'}
                  strokeWidth={isHov ? 2 : 1}
                  style={{ transition: 'all 0.15s' }}
                />
                {isHov && (
                  <text x={x} y={y - 18} fill="#fff" fontSize={10} textAnchor="middle"
                    fontFamily="DM Sans,sans-serif" fontWeight={700}>{fmt(p.price, symbol)}</text>
                )}
              </g>
            );
          })}

          {/* Dropped pin */}
          {pin && (
            <g>
              <circle cx={pin.x} cy={pin.y} r={28} fill="rgba(45,212,191,0.12)" />
              <circle cx={pin.x} cy={pin.y} r={14} fill="rgba(45,212,191,0.3)" stroke="#2dd4bf" strokeWidth={2} />
              <circle cx={pin.x} cy={pin.y} r={5} fill="#2dd4bf" />
              <text x={pin.x} y={pin.y - 22} fill="#2dd4bf" fontSize={10} textAnchor="middle"
                fontFamily="DM Sans,sans-serif" fontWeight={700}>📍 Pin</text>
            </g>
          )}
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 14px',
            display: 'flex', gap: 10, alignItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)', pointerEvents: 'none',
            maxWidth: 320,
          }}>
            <img src={hovered.images?.[0]} alt="" style={{ width: 48, height: 36, borderRadius: 6, objectFit: 'cover' }}
              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=100&q=50'; }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: T.display }}>{fmt(hovered.price, symbol)}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{hovered.title}</div>
              <div style={{ fontSize: 10, color: C.dim }}>📍 {hovered.area}</div>
            </div>
          </div>
        )}

        {/* Map legend */}
        <div style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(7,9,16,0.85)', backdropFilter: 'blur(10px)',
          border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px',
          fontSize: 10, color: C.dim,
        }}>
          <div style={{ fontWeight: 700, color: C.muted, marginBottom: 7, fontSize: 11 }}>Map Legend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'rgba(79,158,255,0.75)' }} />
            Property listing
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#fbbf24' }} />
            Featured
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#2dd4bf' }} />
            Your pin
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 7, color: C.dim }}>
            Click anywhere to drop pin
          </div>
        </div>

        {loading && (
          <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(7,9,16,0.8)', padding: '6px 14px', borderRadius: 99, fontSize: 11, color: C.muted }}>
            Loading {city}…
          </div>
        )}
      </div>

      {selected && <PropertyDetail property={selected} onClose={() => setSelected(null)} country={country} />}
    </div>
  );
}
