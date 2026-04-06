/**
 * Gemini AI Engine — Agentic Real Estate Intelligence
 * Handles all LLM calls with robust retry, validation, and fallback logic
 */

const KEY = import.meta.env.VITE_GEMINI_KEY || '';
const MODEL = 'gemini-1.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ── Core caller with retry + validation ───────────────────────
async function callGemini(prompt, opts = {}) {
  const { retries = 2, json = false, timeout = 15000 } = opts;

  if (!KEY || KEY.trim() === '') {
    throw new GeminiError('API_KEY_MISSING', 'Gemini API key not configured. Add VITE_GEMINI_KEY to your environment variables.');
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(`${API_URL}?key=${KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: json ? 0.3 : 0.7,
            maxOutputTokens: json ? 2048 : 1024,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          ],
        }),
      });
      clearTimeout(timer);

      if (res.status === 400) throw new GeminiError('BAD_REQUEST', 'Invalid request to Gemini API.');
      if (res.status === 401 || res.status === 403) throw new GeminiError('AUTH_FAILED', 'Invalid or expired Gemini API key. Please check your VITE_GEMINI_KEY.');
      if (res.status === 429) {
        if (attempt < retries) { await sleep(2000 * (attempt + 1)); continue; }
        throw new GeminiError('RATE_LIMITED', 'Gemini API rate limit reached. Please wait a moment and try again.');
      }
      if (!res.ok) throw new GeminiError('API_ERROR', `Gemini returned status ${res.status}.`);

      const data = await res.json();

      if (data.promptFeedback?.blockReason) {
        throw new GeminiError('BLOCKED', 'Request was blocked by Gemini safety filters.');
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new GeminiError('EMPTY_RESPONSE', 'Gemini returned an empty response.');

      if (json) {
        return parseJSON(text);
      }
      return text.trim();

    } catch (e) {
      if (e instanceof GeminiError) throw e;
      if (e.name === 'AbortError') throw new GeminiError('TIMEOUT', 'Request timed out. Check your connection.');
      if (attempt < retries) { await sleep(1000); continue; }
      throw new GeminiError('NETWORK_ERROR', `Network error: ${e.message}`);
    }
  }
}

class GeminiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'GeminiError';
  }
}

function parseJSON(text) {
  // Strip markdown fences
  let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Extract first JSON object or array
  const objMatch = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objMatch) clean = objMatch[1];
  return JSON.parse(clean);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Agent 1: Country → Cities Generator ──────────────────────
export async function generateCitiesForCountry(country) {
  const prompt = `You are a global real estate data agent. For the country "${country}", return the top 15 most significant cities for real estate activity, including major metros, growth cities, and investment hotspots.

Return ONLY a JSON array of strings, no other text:
["City1", "City2", ...]

Requirements:
- Use official English city names
- Include capital city first
- Mix of large metros and emerging cities
- All must be real cities in ${country}`;

  try {
    const cities = await callGemini(prompt, { json: true, retries: 2 });
    if (Array.isArray(cities) && cities.length > 0) return cities;
    throw new Error('Invalid city list');
  } catch (e) {
    // Fallback hardcoded cities for key countries
    return COUNTRY_CITY_FALLBACKS[country] || COUNTRY_CITY_FALLBACKS['United Kingdom'];
  }
}

// ── Agent 2: Areas for a City ─────────────────────────────────
export async function generateAreasForCity(city, country) {
  const prompt = `Real estate intelligence agent. For "${city}", ${country}, list the 12 most notable neighbourhoods/districts for property search.

Return ONLY a JSON array of strings:
["Area1", "Area2", ...]

Include: prime central areas, upcoming/gentrifying zones, family-friendly suburbs, investment hotspots.`;

  try {
    const areas = await callGemini(prompt, { json: true, retries: 1 });
    if (Array.isArray(areas) && areas.length > 0) return areas;
    throw new Error('Invalid');
  } catch {
    return [`Central ${city}`, `North ${city}`, `South ${city}`, `East ${city}`, `West ${city}`, `${city} City Centre`];
  }
}

// ── Agent 3: Intelligent Search Intent Parser ─────────────────
export async function parseSearchIntent(query, context = {}) {
  const prompt = `You are an intelligent real estate search agent. Parse this natural language property query and extract structured search parameters.

Query: "${query}"
Context: Country=${context.country || 'UK'}, City=${context.city || 'unknown'}

Return ONLY a JSON object:
{
  "city": "extracted city or null",
  "area": "extracted neighbourhood or null",
  "type": "property type (Flat/House/Studio/etc) or null",
  "min_price": number or null,
  "max_price": number or null,
  "bedrooms": number or null,
  "key_features": ["feature1", "feature2"],
  "intent": "buy|rent|invest|explore",
  "refined_query": "cleaned search terms"
}

Map to property types: Flat, Terraced House, Semi-Detached, Detached House, Bungalow, Maisonette, Studio, Penthouse, Commercial, Land`;

  try {
    return await callGemini(prompt, { json: true });
  } catch {
    return { refined_query: query, intent: 'explore' };
  }
}

// ── Agent 4: Map Area Intelligence ────────────────────────────
export async function getMapAreaSuggestions(lat, lng, userIntent = '') {
  const prompt = `You are a location intelligence agent. A user dropped a pin at coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}).
User intent: "${userIntent || 'find properties nearby'}"

Provide:
1. The approximate area/neighbourhood name at these coordinates
2. 3 key facts about this location for property buyers
3. Property types best suited for this location
4. Investment score 1-10 with reason

Return ONLY JSON:
{
  "area_name": "...",
  "city": "...",
  "facts": ["fact1", "fact2", "fact3"],
  "best_for": ["type1", "type2"],
  "investment_score": 7,
  "investment_reason": "...",
  "search_radius_km": 1
}`;

  try {
    return await callGemini(prompt, { json: true });
  } catch {
    return {
      area_name: 'Selected Location',
      city: 'Unknown',
      facts: ['Prime location selected', 'Properties available nearby', 'Good connectivity'],
      best_for: ['Flat', 'Terraced House'],
      investment_score: 7,
      investment_reason: 'Central location with good amenities',
      search_radius_km: 1,
    };
  }
}

// ── Agent 5: Property Advisor Chat ────────────────────────────
export async function getAdvisorResponse(messages, context = {}) {
  const history = messages.slice(-8).map(m =>
    `${m.role === 'user' ? 'User' : 'Advisor'}: ${m.text}`
  ).join('\n');

  const prompt = `You are an expert AI property advisor with deep knowledge of global real estate markets, investment analysis, legal processes, and financing.

Current context: Country=${context.country || 'Global'}, City=${context.city || 'Not specified'}

Conversation so far:
${history}

Provide a detailed, expert response to the latest user message. Be specific, data-aware, and actionable. Include relevant metrics where useful (yields, price ranges, growth rates). For UK queries, reference SDLT, EPC ratings, Help to Buy, etc. For international queries, adapt to local market context.

Write in clear paragraphs, not bullet lists. Be conversational but authoritative. Max 4 paragraphs.`;

  return callGemini(prompt, { retries: 2, timeout: 20000 });
}

// ── Agent 6: Price Prediction ─────────────────────────────────
export async function getPricePrediction(params) {
  const prompt = `You are an AI property valuation model with access to global real estate market data.

Property details:
- Country: ${params.country || 'UK'}
- City: ${params.city}
- Area/Neighbourhood: ${params.area}
- Property Type: ${params.property_type}
- Size: ${params.size_sqft || params.size_sqm ? `${params.size_sqft || (params.size_sqm * 10.764).toFixed(0)} sqft` : 'not specified'}
- Bedrooms: ${params.bedrooms || 'not specified'}
- Bathrooms: ${params.bathrooms || 'not specified'}
- Age: ${params.age_years ? params.age_years + ' years' : 'not specified'}
- Condition: ${params.condition || 'Good'}
- Floor: ${params.floor || 'not specified'}
- Parking: ${params.parking || 'no'}
- Garden/Outdoor: ${params.garden || 'no'}
- Additional features: ${params.features || 'none'}

Provide a comprehensive valuation. Return ONLY JSON:
{
  "estimated_price": number,
  "currency": "GBP",
  "currency_symbol": "£",
  "price_range_low": number,
  "price_range_high": number,
  "price_per_sqft": number,
  "confidence_pct": number,
  "estimated_monthly_rent": number,
  "gross_rental_yield": number,
  "annual_growth_pct": number,
  "investment_rating": "Excellent|Good|Moderate|Below Average",
  "market_sentiment": "Rising|Stable|Cooling",
  "key_value_drivers": ["driver1", "driver2", "driver3"],
  "risk_factors": ["risk1", "risk2"],
  "comparable_sales": [
    {"description": "...", "price": number, "date": "recent"},
    {"description": "...", "price": number, "date": "recent"}
  ],
  "ai_analysis": "2-3 sentence expert analysis",
  "stamp_duty": number,
  "total_purchase_cost": number
}`;

  try {
    return await callGemini(prompt, { json: true, retries: 2, timeout: 20000 });
  } catch (e) {
    throw new GeminiError(e.code || 'PREDICTION_FAILED', e.message);
  }
}

// ── Agent 7: Market Analysis ──────────────────────────────────
export async function getMarketAnalysis(params) {
  const prompt = `You are a real estate market analyst with comprehensive knowledge of global property markets.

Market to analyse:
- Country: ${params.country || 'UK'}
- City: ${params.city}
- Area/Neighbourhood: ${params.area || 'city-wide'}
- Property Focus: ${params.property_type || 'all types'}
- Analysis Period: Current market (${new Date().getFullYear()})
- Investor Profile: ${params.investor_profile || 'general'}
- Budget Range: ${params.budget || 'all price ranges'}

Return ONLY comprehensive JSON:
{
  "market_summary": "3-4 sentence overview",
  "avg_price": number,
  "avg_price_sqft": number,
  "currency_symbol": "£",
  "price_change_1y_pct": number,
  "price_change_5y_pct": number,
  "avg_rental_yield": number,
  "demand_level": "Very High|High|Moderate|Low",
  "supply_level": "Very Low|Low|Moderate|High",
  "market_phase": "Boom|Growth|Stable|Correction|Recovery",
  "investment_score": number,
  "best_property_types": ["type1", "type2"],
  "top_growth_areas": [{"area": "...", "growth_pct": number, "reason": "..."}],
  "key_drivers": [{"driver": "...", "impact": "Positive|Negative", "magnitude": "High|Medium|Low"}],
  "risks": [{"risk": "...", "severity": "High|Medium|Low", "timeline": "..."}],
  "upcoming_developments": [{"project": "...", "impact": "...", "year": "..."}],
  "buyer_advice": "actionable advice paragraph",
  "investor_verdict": "investment verdict paragraph",
  "price_forecast": {"1yr": number, "3yr": number, "5yr": number}
}`;

  try {
    return await callGemini(prompt, { json: true, retries: 2, timeout: 25000 });
  } catch (e) {
    throw new GeminiError(e.code || 'ANALYSIS_FAILED', e.message);
  }
}

// ── Agent 8: Property Insight (for detail view) ───────────────
export async function getPropertyInsight(property) {
  const prompt = `Real estate investment analyst. Quick assessment of this property:
${property.title} — ${property.area}, ${property.city}
Price: ${property.price ? '£' + property.price.toLocaleString() : 'POA'} | ${property.area_sqft} sqft | ${property.bedrooms || 0} bed | ${property.type}
EPC: ${property.epc_rating} | Tenure: ${property.tenure} | Flood: ${property.flood_risk}
Station: ${property.nearest_station} (${property.station_distance})

In exactly 2 sentences: (1) value assessment and (2) key investment consideration.`;

  try {
    return await callGemini(prompt, { retries: 1, timeout: 10000 });
  } catch { return null; }
}

// ── Agent 9: Smart Suggestions ────────────────────────────────
export async function getSearchSuggestions(partial, country, city) {
  if (!partial || partial.length < 2) return [];
  const prompt = `UK/Global property search autocomplete. User typed: "${partial}" in ${city || country || 'UK'}.

Return 5 search suggestions as JSON array of strings. Mix of: areas, property types, specific queries.
Example: ["2 bed flat in Shoreditch", "Victorian terraced house", "Investment property under £300k"]

ONLY return the JSON array:`;

  try {
    const suggestions = await callGemini(prompt, { json: true, retries: 0, timeout: 5000 });
    return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
  } catch { return []; }
}

// ── Fallback city data ────────────────────────────────────────
export const COUNTRY_CITY_FALLBACKS = {
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Edinburgh', 'Bristol', 'Liverpool', 'Oxford', 'Cambridge', 'Brighton', 'Cardiff', 'Glasgow', 'Nottingham', 'Sheffield', 'Newcastle'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin', 'Miami', 'Atlanta', 'Seattle', 'Denver', 'Boston'],
  'India': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kochi', 'Chandigarh', 'Indore', 'Bhopal'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle', 'Hobart', 'Darwin', 'Wollongong', 'Sunshine Coast', 'Geelong', 'Townsville', 'Cairns'],
  'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Quebec City', 'Hamilton', 'Halifax', 'Victoria', 'Kelowna', 'London', 'Windsor', 'Saskatoon'],
  'UAE': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'],
  'Singapore': ['Central', 'East', 'North', 'West', 'North-East'],
  'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Düsseldorf', 'Stuttgart', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Nuremberg', 'Hannover', 'Bonn'],
};

export const SUPPORTED_COUNTRIES = [
  'United Kingdom', 'United States', 'India', 'Australia', 'Canada',
  'UAE', 'Singapore', 'Germany', 'France', 'Spain', 'Italy',
  'Netherlands', 'Portugal', 'Thailand', 'Malaysia', 'Japan',
  'South Africa', 'Brazil', 'Mexico', 'New Zealand',
];

export { GeminiError };
