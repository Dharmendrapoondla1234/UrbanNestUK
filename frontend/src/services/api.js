const BASE = import.meta.env.VITE_API_BASE || 'https://urbannestuk.onrender.com';
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || '';

// ── Property API ─────────────────────────────────────────────
export async function searchProperties(params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
  const res = await fetch(`${BASE}/api/properties/search?${qs}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function getFeatured(limit = 6) {
  const res = await fetch(`${BASE}/api/properties/featured?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch featured');
  return res.json();
}

export async function getProperty(id) {
  const res = await fetch(`${BASE}/api/properties/${id}`);
  if (!res.ok) throw new Error('Property not found');
  return res.json();
}

export async function getCities() {
  const res = await fetch(`${BASE}/api/cities`);
  if (!res.ok) throw new Error('Failed to fetch cities');
  return res.json();
}

export async function getMarketData(city, area) {
  const res = await fetch(`${BASE}/api/market/${encodeURIComponent(city)}/${encodeURIComponent(area)}`);
  if (!res.ok) throw new Error('Market data unavailable');
  return res.json();
}

export async function getPriceEstimate(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/api/price-estimate?${qs}`);
  if (!res.ok) throw new Error('Estimate failed');
  return res.json();
}

// ── Gemini AI ─────────────────────────────────────────────────
async function callGemini(prompt) {
  if (!GEMINI_KEY) throw new Error('Gemini key not configured');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) throw new Error('Gemini API error');
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function getAIPropertyInsight(property) {
  const prompt = `You are a UK property expert. Provide a concise investment insight for this property:
- ${property.bedrooms ? property.bedrooms + ' bed ' : ''}${property.type} in ${property.area}, ${property.city}
- Price: £${property.price?.toLocaleString()}, ${property.area_sqft} sqft
- EPC: ${property.epc_rating}, Tenure: ${property.tenure}
- Amenities: ${property.amenities?.join(', ')}

Give 2-3 sentences covering: value for money, investment potential, and one key risk. Be specific and data-driven.`;
  return callGemini(prompt);
}

export async function getAIMarketInsight(city, area, data) {
  const prompt = `UK property market expert. Summarise the market for ${area}, ${city}:
- Avg price: £${data.avg_price?.toLocaleString()}, £${data.avg_price_sqft}/sqft
- 1yr growth: ${data.price_change_1y}%, demand: ${data.demand_level}
- Rental yield: ${data.rental_yield_avg}%

Write 3 sentences: current market state, growth outlook, best buyer profile. UK context only.`;
  return callGemini(prompt);
}

export async function getAIAdvisor(query, city) {
  const prompt = `You are a UK property advisor. A user asks: "${query}"
They're interested in properties in ${city || 'UK'}.

Reply in 3-4 concise paragraphs covering: area recommendations, price expectations, investment tips, and practical next steps. Use UK terminology (stamp duty, EPC, freehold/leasehold, etc). Be helpful and specific.`;
  return callGemini(prompt);
}

export async function getAIPricePrediction(params, estimate) {
  const prompt = `UK property valuation expert. Analyse this estimate:
Property: ${params.bedrooms || ''}bed ${params.property_type} in ${params.area}, ${params.city}
Size: ${params.area_sqft} sqft, Age: ${params.age || 0} years
Estimated price: £${estimate.predicted_price?.toLocaleString()} (£${estimate.price_per_sqft}/sqft)

In 2-3 sentences: validate the estimate, key value drivers, and market outlook for this specific property type and location.`;
  return callGemini(prompt);
}
