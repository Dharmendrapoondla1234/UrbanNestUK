import { useState, useEffect, useRef } from 'react';
import { C, T, fmt, btn, UK_CITIES } from '../utils/design.js';
import { searchProperties } from '../services/api.js';
import PropertyCard from '../components/property/PropertyCard.jsx';
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
};

const MAPS_KEY = import.meta.env.VITE_MAPS_KEY || '';

export default function MapPage() {
  const [city, setCity] = useState('London');
  const [properties, setProperties] = useState([]);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    setLoading(true);
    searchProperties({ city, limit: 40 })
      .then(d => setProperties(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [city]);

  // If Google Maps key exists, load it
  useEffect(() => {
    if (!MAPS_KEY || !mapRef.current || !properties.length) return;
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}`;
      script.onload = () => initGoogleMap();
      document.head.appendChild(script);
    } else {
      initGoogleMap();
    }
  }, [properties, MAPS_KEY]);

  function initGoogleMap() {
    if (!window.google || !mapRef.current) return;
    const center = CITY_CENTERS[city];
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom: 12,
      styles: darkMapStyles,
    });
    googleMapRef.current = map;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = properties.map(p => {
      const marker = new window.google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map,
        title: p.title,
        label: { text: fmt(p.price).replace('£', '£'), color: '#fff', fontSize: '11px', fontWeight: 'bold' },
      });
      marker.addListener('click', () => setSelected(p));
      return marker;
    });
  }

  // SVG map fallback
  function SVGMap() {
    const center = CITY_CENTERS[city];
    const W = 700, H = 500;
    const SCALE = 2000;

    function toXY(lat, lng) {
      const x = (lng - center.lng) * SCALE + W / 2;
      const y = (center.lat - lat) * SCALE + H / 2;
      return { x, y };
    }

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: '#0d1117' }}>
        {/* Grid lines */}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * H / 7} x2={W} y2={i * H / 7}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`v${i}`} x1={i * W / 9} y1={0} x2={i * W / 9} y2={H}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}

        {/* City label */}
        <text x={W / 2} y={30} fill="rgba(255,255,255,0.15)" fontSize={18} fontWeight={800}
          textAnchor="middle" fontFamily="Inter,sans-serif">{city}</text>

        {/* Property markers */}
        {properties.map(p => {
          const { x, y } = toXY(p.lat, p.lng);
          if (x < 0 || x > W || y < 0 || y > H) return null;
          const isHov = hovered?.id === p.id;
          return (
            <g key={p.id}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelected(p)}
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
            >
              <circle cx={x} cy={y} r={isHov ? 14 : 10}
                fill={isHov ? '#3b8cf8' : 'rgba(59,140,248,0.7)'}
                stroke={isHov ? '#fff' : 'rgba(59,140,248,0.3)'}
                strokeWidth={isHov ? 2 : 1}
                style={{ transition: 'all 0.15s' }}
              />
              {isHov && (
                <text x={x} y={y - 18} fill="#fff" fontSize={10} textAnchor="middle"
                  fontFamily="Inter,sans-serif" fontWeight={700}>{fmt(p.price)}</text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: 360, flexShrink: 0,
        background: C.surface, borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* City selector */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontFamily: T.display, fontSize: 18, fontWeight: 900, color: C.text, margin: '0 0 10px' }}>Map Search</h2>
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text,
              fontSize: 13, fontFamily: T.body, outline: 'none',
            }}
          >
            {UK_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>
            {loading ? 'Loading…' : `${properties.length} properties in ${city}`}
          </div>
        </div>

        {/* Property list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {properties.map(p => (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered?.id === p.id ? 'rgba(59,140,248,0.08)' : C.card,
                border: `1px solid ${hovered?.id === p.id ? 'rgba(59,140,248,0.3)' : C.border}`,
                borderRadius: 10, padding: 12, marginBottom: 8, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', gap: 10 }}>
                <img
                  src={p.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&q=60'}
                  alt=""
                  style={{ width: 72, height: 54, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&q=60'; }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: T.display }}>{fmt(p.price)}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>📍 {p.area}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {MAPS_KEY ? (
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <SVGMap />
        )}

        {/* Hovered tooltip */}
        {hovered && !MAPS_KEY && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '10px 16px',
            display: 'flex', gap: 10, alignItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}>
            <img src={hovered.images?.[0]} alt="" style={{ width: 48, height: 36, borderRadius: 6, objectFit: 'cover' }}
              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&q=60'; }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{fmt(hovered.price)}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{hovered.title}</div>
            </div>
          </div>
        )}

        {!MAPS_KEY && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '6px 12px',
            fontSize: 11, color: C.dim,
          }}>
            SVG map — add VITE_MAPS_KEY for Google Maps
          </div>
        )}
      </div>

      {selected && <PropertyDetail property={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
];
