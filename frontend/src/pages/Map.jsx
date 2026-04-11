/**
 * UrbanNest AI — Map Page
 * Real Leaflet.js map (CARTO dark tiles, no API key needed).
 * Drop a pin → AI analyses the location → shows nearby properties.
 * Works for both India and UK.
 */
import { useState, useEffect, useRef } from 'react';
import { searchFilter } from '../services/api.js';
import { getMapAreaInfo, generateAreasForCity } from '../services/gemini.js';
import { useGlobal } from '../hooks/useGlobal.jsx';

const CITY_CENTERS = {
  // UK
  London:     { lat: 51.5074, lng: -0.1278, zoom: 12 },
  Manchester: { lat: 53.4808, lng: -2.2426, zoom: 12 },
  Birmingham: { lat: 52.4862, lng: -1.8904, zoom: 12 },
  Leeds:      { lat: 53.8008, lng: -1.5491, zoom: 12 },
  Edinburgh:  { lat: 55.9533, lng: -3.1883, zoom: 12 },
  Bristol:    { lat: 51.4545, lng: -2.5879, zoom: 12 },
  Liverpool:  { lat: 53.4084, lng: -2.9916, zoom: 12 },
  Oxford:     { lat: 51.7520, lng: -1.2577, zoom: 13 },
  // India
  Mumbai:     { lat: 19.0760, lng: 72.8777, zoom: 12 },
  Delhi:      { lat: 28.7041, lng: 77.1025, zoom: 11 },
  Bangalore:  { lat: 12.9716, lng: 77.5946, zoom: 12 },
  Hyderabad:  { lat: 17.3850, lng: 78.4867, zoom: 12 },
  Chennai:    { lat: 13.0827, lng: 80.2707, zoom: 12 },
  Pune:       { lat: 18.5204, lng: 73.8567, zoom: 12 },
  Gurgaon:    { lat: 28.4595, lng: 77.0266, zoom: 12 },
};

export default function MapPage() {
  const { country, city: globalCity, cities, symbol } = useGlobal();
  const [city, setCity]               = useState(globalCity || 'London');
  const [properties, setProperties]   = useState([]);
  const [selected, setSelected]       = useState(null);
  const [pin, setPin]                 = useState(null);
  const [pinInfo, setPinInfo]         = useState(null);
  const [pinLoading, setPinLoading]   = useState(false);
  const [nearbyProps, setNearbyProps] = useState([]);
  const [intent, setIntent]           = useState('');
  const [areaRecs, setAreaRecs]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const mapRef        = useRef(null);
  const leafletRef    = useRef(null);
  const markersRef    = useRef([]);
  const pinMarkerRef  = useRef(null);

  // Sync city from navbar
  useEffect(() => {
    if (globalCity && globalCity !== city) setCity(globalCity);
  }, [globalCity]); // eslint-disable-line

  // ── Init Leaflet map ────────────────────────────────────────────
  useEffect(() => {
    if (leafletRef.current || !mapRef.current) return;

    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }

    const initMap = (L) => {
      const center = CITY_CENTERS[city] || { lat: 51.5074, lng: -0.1278, zoom: 11 };
      const map = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom: center.zoom,
        zoomControl: true,
      });

      // Dark CARTO tiles — no API key required
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19,
      }).addTo(map);

      map.on('click', e => handleMapClick(e.latlng.lat, e.latlng.lng, L, map));
      leafletRef.current = { map, L };
    };

    if (window.L) {
      initMap(window.L);
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.onload = () => initMap(window.L);
      document.head.appendChild(script);
    }

    return () => {
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
      }
    };
  }, []); // eslint-disable-line

  // Re-centre when city changes
  useEffect(() => {
    if (!leafletRef.current) return;
    const center = CITY_CENTERS[city];
    if (center) leafletRef.current.map.setView([center.lat, center.lng], center.zoom);
  }, [city]);

  // Load city properties
  useEffect(() => {
    setLoading(true);
    setPin(null); setPinInfo(null); setNearbyProps([]);
    searchFilter({ country, city, limit: 80 })
      .then(d => setProperties(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [city, country]);

  // Place property markers on map
  useEffect(() => {
    if (!leafletRef.current) return;
    const { map, L } = leafletRef.current;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    properties.forEach(p => {
      if (!p.lat || !p.lng) return;
      const color = p.featured ? '#FBBF24' : '#4F9EFF';
      const size  = p.featured ? 14 : 10;

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;
          border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 6px ${color}99;"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([p.lat, p.lng], { icon })
        .addTo(map)
        .on('click', () => setSelected(p))
        .bindPopup(`
          <div style="font-family:system-ui;min-width:160px">
            <b style="font-size:14px">${p.price_display}</b>
            <div style="font-size:12px;color:#555;margin:3px 0">${p.title}</div>
            <div style="font-size:11px;color:#888">📍 ${p.area}</div>
          </div>
        `);

      markersRef.current.push(marker);
    });
  }, [properties]);

  // Generate AI area suggestions when intent typed
  useEffect(() => {
    if (!intent || intent.length < 4) return;
    const t = setTimeout(async () => {
      const areas = await generateAreasForCity(city, country);
      setAreaRecs(areas.slice(0, 6));
    }, 600);
    return () => clearTimeout(t);
  }, [intent, city, country]);

  async function handleMapClick(lat, lng, L, map) {
    // Remove old pin
    if (pinMarkerRef.current) { pinMarkerRef.current.remove(); pinMarkerRef.current = null; }

    setPin({ lat, lng });
    setPinLoading(true);
    setPinInfo(null);
    setNearbyProps([]);

    // Teal pin marker
    const pinIcon = L.divIcon({
      className: '',
      html: `<div style="width:20px;height:20px;background:#2DD4BF;border-radius:50%;
        border:3px solid white;box-shadow:0 0 12px #2DD4BF88;"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    pinMarkerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    map.panTo([lat, lng]);

    try {
      const [info, nearby] = await Promise.all([
        getMapAreaInfo(lat, lng, intent),
        searchFilter({ country, city, limit: 12 }).then(d =>
          (d.items || []).filter(p => {
            if (!p.lat || !p.lng) return false;
            return Math.sqrt((p.lat - lat) ** 2 + (p.lng - lng) ** 2) < 0.04;
          }).slice(0, 6)
        ),
      ]);
      setPinInfo(info);
      setNearbyProps(nearby);
    } finally {
      setPinLoading(false);
    }
  }

  function clearPin() {
    setPin(null); setPinInfo(null); setNearbyProps([]);
    if (pinMarkerRef.current) { pinMarkerRef.current.remove(); pinMarkerRef.current = null; }
  }

  const displayProps = pin ? nearbyProps : properties;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 58px)', overflow: 'hidden', background: '#0D1117' }}>
      {/* ── Sidebar ── */}
      <div style={{
        width: 340, flexShrink: 0, background: '#111827',
        borderRight: '1px solid #1F2937', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Controls */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #1F2937', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#F9FAFB' }}>◈ Map Search</h2>
            {pin && (
              <button onClick={clearPin} style={{
                padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', fontSize: 11, cursor: 'pointer',
              }}>✕ Clear Pin</button>
            )}
          </div>

          <select value={city} onChange={e => setCity(e.target.value)} style={{
            width: '100%', padding: '8px 10px', marginBottom: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid #374151',
            borderRadius: 8, color: '#E5E7EB', fontSize: 13, outline: 'none',
          }}>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <input placeholder="🤖 Intent: 'near schools', 'IT park area'…"
            value={intent} onChange={e => setIntent(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', boxSizing: 'border-box',
              background: 'rgba(79,158,255,0.07)', border: '1px solid rgba(79,158,255,0.25)',
              borderRadius: 8, color: '#E5E7EB', fontSize: 12, outline: 'none',
            }}
          />

          {areaRecs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {areaRecs.map(a => (
                <button key={a} onClick={() => setIntent(a)} style={{
                  padding: '3px 8px', borderRadius: 20, fontSize: 10,
                  background: 'rgba(79,158,255,0.1)', border: '1px solid rgba(79,158,255,0.2)',
                  color: '#4F9EFF', cursor: 'pointer',
                }}>{a}</button>
              ))}
            </div>
          )}

          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>
            {pin ? '📍 Pin placed — showing nearby' : `${loading ? 'Loading…' : `${properties.length} properties`} · Click to drop pin`}
          </div>
        </div>

        {/* Pin info card */}
        {pin && (
          <div style={{
            margin: '10px 12px', padding: 12,
            background: 'rgba(45,212,191,0.07)', border: '1px solid rgba(45,212,191,0.2)',
            borderRadius: 10, flexShrink: 0,
          }}>
            {pinLoading ? (
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>🤖 Analysing location…</div>
            ) : pinInfo ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#F9FAFB' }}>{pinInfo.area_name}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>{pinInfo.city}</div>
                {(pinInfo.facts || []).map((f, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>• {f}</div>
                ))}
                <div style={{ marginTop: 8, fontSize: 11, color: '#2DD4BF' }}>
                  Investment score: {pinInfo.investment_score}/10
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Property list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px 12px' }}>
          {displayProps.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: '#6B7280' }}>
              {loading ? 'Loading properties…' : pin ? 'No properties in this area' : 'No properties loaded'}
            </div>
          ) : (
            displayProps.map(p => (
              <div key={p.id} onClick={() => setSelected(p)}
                style={{
                  background: selected?.id === p.id ? 'rgba(79,158,255,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selected?.id === p.id ? 'rgba(79,158,255,0.4)' : '#1F2937'}`,
                  borderRadius: 8, padding: 9, marginBottom: 7, cursor: 'pointer',
                }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <img
                    src={p.images?.[0]?.url || p.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100&q=60'}
                    alt="" style={{ width: 62, height: 48, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100&q=60'; }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F9FAFB' }}>{p.price_display}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{p.title}</div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginTop: 3 }}>📍 {p.area}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Leaflet Map ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Legend overlay */}
        <div style={{
          position: 'absolute', top: 14, right: 14, zIndex: 1000,
          background: 'rgba(7,9,16,0.88)', backdropFilter: 'blur(8px)',
          border: '1px solid #1F2937', borderRadius: 9, padding: '10px 13px', fontSize: 10, color: '#6B7280',
        }}>
          <div style={{ fontWeight: 700, color: '#9CA3AF', marginBottom: 6, fontSize: 11 }}>Legend</div>
          {[['#4F9EFF', 'Listing'], ['#FBBF24', 'Featured'], ['#2DD4BF', 'Your pin']].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              {label}
            </div>
          ))}
          <div style={{ borderTop: '1px solid #1F2937', paddingTop: 6, marginTop: 4 }}>Click to drop pin</div>
        </div>

        {loading && (
          <div style={{
            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
            background: 'rgba(7,9,16,0.85)', padding: '6px 14px', borderRadius: 20, fontSize: 11, color: '#9CA3AF',
          }}>
            Loading {city}…
          </div>
        )}
      </div>

      {/* Property detail modal */}
      {selected && (
        <PropertyModal property={selected} symbol={symbol} country={country} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function PropertyModal({ property: p, symbol, country, onClose }) {
  const imgs = (p.images || []).map(i => typeof i === 'string' ? i : i?.url).filter(Boolean);
  const img  = imgs[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=70';

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, width: 360, height: '100%',
      background: '#111827', borderLeft: '1px solid #1F2937',
      overflowY: 'auto', zIndex: 2000, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ position: 'relative' }}>
        <img src={img} alt={p.title} style={{ width: '100%', height: 200, objectFit: 'cover' }}
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=70'; }} />
        <button onClick={onClose} style={{
          position: 'absolute', top: 10, right: 10, width: 28, height: 28,
          borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none',
          color: '#fff', fontSize: 16, cursor: 'pointer', lineHeight: 1,
        }}>✕</button>
        {p.featured && (
          <span style={{ position: 'absolute', top: 10, left: 10, padding: '2px 7px',
            background: '#FBBF24', color: '#78350F', borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
            ⭐ FEATURED
          </span>
        )}
      </div>
      <div style={{ padding: '16px 16px 24px' }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#F9FAFB', marginBottom: 4 }}>{p.price_display}</div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>{p.title}</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>📍 {p.area}, {p.city}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            ['🛏', `${p.bedrooms || '—'} Beds`],
            ['🚿', `${p.bathrooms || '—'} Baths`],
            ['📐', `${p.area_sqft || '—'} sqft`],
            ['🏠', p.property_type || '—'],
            ['🔑', p.tenure || '—'],
            ['⚡', p.epc_rating ? `EPC ${p.epc_rating}` : '—'],
          ].map(([icon, val]) => (
            <div key={val} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '8px 10px' }}>
              <div style={{ fontSize: 14, marginBottom: 2 }}>{icon}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>{val}</div>
            </div>
          ))}
        </div>

        {p.amenities?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
            {p.amenities.slice(0, 6).map(a => (
              <span key={a} style={{ padding: '2px 7px', background: 'rgba(79,158,255,0.1)',
                border: '1px solid rgba(79,158,255,0.2)', borderRadius: 4, fontSize: 10, color: '#4F9EFF' }}>
                {a}
              </span>
            ))}
          </div>
        )}

        {p.source_url && (
          <a href={p.source_url} target="_blank" rel="noreferrer" style={{
            display: 'block', textAlign: 'center', padding: '10px',
            background: '#1B4FD8', color: '#fff', borderRadius: 8, fontSize: 13,
            fontWeight: 600, textDecoration: 'none',
          }}>
            View Full Listing →
          </a>
        )}

        {p.lat && p.lng && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
            target="_blank" rel="noreferrer" style={{
              display: 'block', textAlign: 'center', padding: '9px',
              background: 'rgba(255,255,255,0.05)', color: '#9CA3AF',
              border: '1px solid #374151', borderRadius: 8, fontSize: 12,
              textDecoration: 'none', marginTop: 8,
            }}>
            🗺️ Open in Google Maps
          </a>
        )}
      </div>
    </div>
  );
}
