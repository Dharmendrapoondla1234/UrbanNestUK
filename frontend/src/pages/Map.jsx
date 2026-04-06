import { useState, useRef } from 'react';
import { callGemini, parseJSON } from '../services/gemini.js';
import { COUNTRIES, fmtPrice, AIBox, GeminiBadge, Card, PROP_IMGS } from '../components/ui.jsx';
import PropertyCard from '../components/property/PropertyCard.jsx';
import PropertyDetail from '../components/property/PropertyDetail.jsx';
import { C } from '../utils/design.js';

const DEMO = [
  { id:1,x:45,y:38,title:'Modern 2-bed Flat',price:450000,city:'London',area:'Shoreditch',type:'Flat',bedrooms:2,bathrooms:1,address:'42 Curtain Road, Shoreditch',images:[PROP_IMGS[1]],rating:4.5,currency_symbol:'£',country:'United Kingdom',verified:true,tenure:'Leasehold' },
  { id:2,x:60,y:55,title:'Victorian Terraced House',price:680000,city:'London',area:'Clapham',type:'Terraced House',bedrooms:3,bathrooms:2,address:'18 Abbeville Road, Clapham',images:[PROP_IMGS[0]],rating:4.2,currency_symbol:'£',country:'United Kingdom',verified:true,tenure:'Freehold' },
  { id:3,x:30,y:62,title:'Luxury Penthouse',price:1250000,city:'London',area:'Chelsea',type:'Penthouse',bedrooms:4,bathrooms:3,address:'8 Sloane Square, Chelsea',images:[PROP_IMGS[3]],rating:4.8,currency_symbol:'£',country:'United Kingdom',verified:true,tenure:'Leasehold' },
  { id:4,x:72,y:28,title:'Studio near Liverpool St',price:320000,city:'London',area:'City of London',type:'Studio',bedrooms:1,bathrooms:1,address:'5 Bishopsgate, City of London',images:[PROP_IMGS[1]],rating:4.0,currency_symbol:'£',country:'United Kingdom',verified:false,tenure:'Leasehold' },
  { id:5,x:55,y:72,title:'Semi-Detached Family Home',price:540000,city:'London',area:'Balham',type:'Semi-Detached',bedrooms:4,bathrooms:2,address:'22 Bedford Hill, Balham',images:[PROP_IMGS[4]],rating:4.3,currency_symbol:'£',country:'United Kingdom',verified:true,tenure:'Freehold' },
];

export default function MapPage() {
  const [country, setCountry] = useState('United Kingdom');
  const [mapSearch, setMapSearch] = useState('');
  const [aiAreas, setAiAreas] = useState([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const [customMarkers, setCustomMarkers] = useState([]);
  const [markerProps, setMarkerProps] = useState([]);
  const [markerLoading, setMarkerLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const mapRef = useRef(null);

  const inputStyle = { background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f2f8', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit' };

  async function suggestAreas() {
    if (!mapSearch.trim()) return;
    setAreaLoading(true); setAiAreas([]);
    try {
      const r = await callGemini(
        `For property search "${mapSearch}" in ${country}, suggest 5 specific real neighbourhoods. Return ONLY JSON array: [{"area":"Name","reason":"brief reason","avg_price":"e.g. £450k"}]`,
        'Property expert. Return ONLY valid JSON array.'
      );
      setAiAreas(await parseJSON(r) || []);
    } catch (e) { console.error(e); }
    setAreaLoading(false);
  }

  function handleMapClick(e) {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const id = Date.now();
    setCustomMarkers(m => [...m, { id, x, y }]);
    fetchPropsForMarker(x, y, id);
  }

  async function fetchPropsForMarker(x, y, markerId) {
    setMarkerLoading(true);
    try {
      const r = await callGemini(
        `Generate 2 realistic properties in ${country} near map position (${Math.round(x)}%,${Math.round(y)}%). Return ONLY a JSON array with: id,title,address,city,country,currency_symbol,type,bedrooms,bathrooms,price,area,rating,verified,tenure.`,
        'Return ONLY JSON array of 2 property objects with realistic local prices.'
      );
      const props = await parseJSON(r);
      if (props) {
        setMarkerProps(p => [...p, ...props.map((pp, i) => ({
          ...pp,
          id: pp.id || markerId + i,
          images: [PROP_IMGS[Math.floor(Math.random() * PROP_IMGS.length)]],
          _markerId: markerId,
        }))]);
      }
    } catch (e) { console.error(e); }
    setMarkerLoading(false);
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f0f2f8' }}>🗺 AI Map Search</h1>
        <GeminiBadge />
      </div>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>Click the map to drop markers and find nearby properties • Gemini AI suggests the best areas</p>

      <Card style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: aiAreas.length ? 12 : 0 }}>
          <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...inputStyle, width: 160, flexShrink: 0 }}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={mapSearch} onChange={e => setMapSearch(e.target.value)}
            placeholder='Describe what you want, e.g. "quiet family area near good schools"'
            style={{ ...inputStyle, flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && suggestAreas()}
          />
          <button
            onClick={suggestAreas}
            style={{ background: 'linear-gradient(135deg,#4285f4,#34a853)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontSize: 13 }}
          >
            {areaLoading ? '...' : '✦ AI Areas'}
          </button>
          {customMarkers.length > 0 && (
            <button
              onClick={() => { setCustomMarkers([]); setMarkerProps([]); }}
              style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontSize: 13 }}
            >
              🗑 Clear ({customMarkers.length})
            </button>
          )}
        </div>

        {aiAreas.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {aiAreas.map((a, i) => (
              <div
                key={i}
                onClick={() => setMapSearch(a.area)}
                style={{ background: '#12141a', border: '1px solid rgba(66,133,244,0.2)', borderRadius: 10, padding: '8px 12px', flex: '1 1 160px', minWidth: 140, cursor: 'pointer' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4285f4', marginBottom: 2 }}>{a.area}</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: a.avg_price ? 2 : 0 }}>{a.reason}</div>
                {a.avg_price && <div style={{ fontSize: 11, color: '#34a853', fontWeight: 700 }}>{a.avg_price}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Map */}
      <div
        ref={mapRef}
        onClick={handleMapClick}
        style={{ background: '#0c1525', borderRadius: 12, position: 'relative', height: 420, cursor: 'crosshair', overflow: 'hidden', marginBottom: 16, border: '1px solid rgba(66,133,244,0.2)' }}
      >
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}>
          {[...Array(10)].map((_, i) => [
            <line key={'h'+i} x1="0" y1={`${i*10}%`} x2="100%" y2={`${i*10}%`} stroke="#4285f4" strokeWidth="0.5" />,
            <line key={'v'+i} x1={`${i*10}%`} y1="0" x2={`${i*10}%`} y2="100%" stroke="#4285f4" strokeWidth="0.5" />,
          ])}
        </svg>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%,rgba(66,133,244,0.05) 0%,transparent 65%)' }} />

        {DEMO.map(p => (
          <div
            key={p.id}
            onClick={e => { e.stopPropagation(); setSelected(p); }}
            style={{ position: 'absolute', left: p.x+'%', top: p.y+'%', transform: 'translate(-50%,-100%)', cursor: 'pointer' }}
          >
            <div style={{ background: 'rgba(0,0,0,0.85)', color: '#f0f2f8', fontSize: 10, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', marginBottom: 2, textAlign: 'center' }}>{fmtPrice(p.price, '£')}</div>
            <div style={{ width: 26, height: 32, background: 'linear-gradient(135deg,#4285f4,#34a853)', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', border: '2px solid rgba(255,255,255,0.25)', margin: '0 auto' }} />
          </div>
        ))}

        {customMarkers.map(m => (
          <div key={m.id} onClick={e => e.stopPropagation()} style={{ position: 'absolute', left: m.x+'%', top: m.y+'%', transform: 'translate(-50%,-100%)' }}>
            <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fbbc04', fontSize: 10, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', marginBottom: 2, textAlign: 'center' }}>📍 Custom</div>
            <div style={{ width: 26, height: 32, background: 'linear-gradient(135deg,#fbbc04,#ea4335)', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', border: '2px solid rgba(255,255,255,0.25)', margin: '0 auto' }} />
          </div>
        ))}

        <div style={{ position: 'absolute', bottom: 10, left: 12, background: 'rgba(0,0,0,0.75)', borderRadius: 7, padding: '5px 10px', fontSize: 11, color: C.muted }}>🖱 Click to drop a marker</div>

        {markerLoading && (
          <div style={{ position: 'absolute', top: 10, right: 12, background: 'rgba(0,0,0,0.8)', borderRadius: 7, padding: '5px 10px', fontSize: 11, color: '#4285f4', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, border: '2px solid rgba(66,133,244,0.3)', borderTopColor: '#4285f4', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            Finding properties...
          </div>
        )}
      </div>

      {markerProps.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>🏠 Properties near your markers</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
            {markerProps.map((p, i) => <PropertyCard key={i} p={p} onClick={() => setSelected(p)} />)}
          </div>
        </div>
      )}

      <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>Featured Properties</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
        {DEMO.map(p => <PropertyCard key={p.id} p={p} onClick={() => setSelected(p)} />)}
      </div>

      {selected && <PropertyDetail property={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
