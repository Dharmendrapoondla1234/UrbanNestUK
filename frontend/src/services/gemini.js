/**
 * Gemini AI Engine — Agentic Real Estate Intelligence
 * Fixed: loop fallthrough, role naming, JSON parsing edge cases
 */

const KEY = import.meta.env.VITE_GEMINI_KEY || '';
const MODEL = 'gemini-1.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ── Core caller ───────────────────────────────────────────────
async function callGemini(prompt, opts = {}) {
  const { retries = 2, json = false, timeout = 15000 } = opts;

  // FIX: validate key before any network attempt
  if (!KEY || !KEY.trim()) {
    throw new GeminiError('API_KEY_MISSING', 'Gemini API key not configured. Add VITE_GEMINI_KEY to your Vercel environment variables and redeploy.');
  }

  let lastError = null;

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
            temperature: json ? 0.2 : 0.7,
            maxOutputTokens: json ? 2048 : 1024,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          ],
        }),
      });
      clearTimeout(timer);

      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        throw new GeminiError('BAD_REQUEST', body?.error?.message || 'Invalid request to Gemini API.');
      }
      if (res.status === 401 || res.status === 403) {
        throw new GeminiError('AUTH_FAILED', 'Invalid or expired Gemini API key. Please check VITE_GEMINI_KEY at aistudio.google.com.');
      }
      if (res.status === 429) {
        if (attempt < retries) { await sleep(2000 * (attempt + 1)); continue; }
        throw new GeminiError('RATE_LIMITED', 'Gemini rate limit reached. Please wait a moment and try again.');
      }
      if (!res.ok) {
        throw new GeminiError('API_ERROR', `Gemini API returned status ${res.status}.`);
      }

      const data = await res.json();

      if (data.promptFeedback?.blockReason) {
        throw new GeminiError('BLOCKED', `Request blocked: ${data.promptFeedback.blockReason}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        // FIX: check finish reason for better diagnosis
        const reason = data.candidates?.[0]?.finishReason;
        if (reason === 'MAX_TOKENS') throw new GeminiError('MAX_TOKENS', 'Response too long. Try a simpler query.');
        if (reason === 'SAFETY') throw new GeminiError('BLOCKED', 'Response blocked by safety filters.');
        throw new GeminiError('EMPTY_RESPONSE', 'Gemini returned an empty response.');
      }

      return json ? parseJSON(text) : text.trim();

    } catch (e) {
      if (e instanceof GeminiError) {
        // Only retry on retriable errors
        if (['RATE_LIMITED', 'API_ERROR', 'NETWORK_ERROR', 'TIMEOUT'].includes(e.code) && attempt < retries) {
          lastError = e;
          await sleep(1000 * (attempt + 1));
          continue;
        }
        throw e;
      }
      if (e.name === 'AbortError') {
        lastError = new GeminiError('TIMEOUT', 'Request timed out. Check your connection and try again.');
        if (attempt < retries) { await sleep(1000); continue; }
        throw lastError;
      }
      lastError = new GeminiError('NETWORK_ERROR', `Network error: ${e.message}`);
      if (attempt < retries) { await sleep(1000); continue; }
      throw lastError;
    }
  }

  // FIX: was falling off end of loop silently — now always throws
  throw lastError || new GeminiError('FAILED', 'Request failed after all retries.');
}

export class GeminiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'GeminiError';
  }
}

// FIX: more robust JSON extraction
function parseJSON(text) {
  let clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try direct parse first
  try { return JSON.parse(clean); } catch (_) {}

  // Extract first complete JSON object or array
  const arrMatch = clean.match(/(\[[\s\S]*\])/);
  const objMatch = clean.match(/(\{[\s\S]*\})/);

  // Prefer array if prompt expected one, else object
  const candidate = arrMatch?.[1] || objMatch?.[1];
  if (candidate) {
    try { return JSON.parse(candidate); } catch (_) {}
  }

  throw new GeminiError('JSON_PARSE_ERROR', 'AI returned invalid JSON. Please try again.');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Agent 1: Country → Cities ─────────────────────────────────
export async function generateCitiesForCountry(country) {
  const prompt = `Real estate data agent. List the top 15 most significant cities for real estate in "${country}".
Return ONLY a valid JSON array of city name strings, no markdown, no extra text:
["City1","City2",...]
Start with the capital. Include major metros, growth cities, investment hotspots. All must be real cities.`;

  try {
    const result = await callGemini(prompt, { json: true, retries: 2 });
    if (Array.isArray(result) && result.length > 0) return result;
    throw new Error('Not an array');
  } catch {
    return COUNTRY_CITY_FALLBACKS[country] || COUNTRY_CITY_FALLBACKS['United Kingdom'];
  }
}

// ── Agent 2: City → Areas ─────────────────────────────────────
export async function generateAreasForCity(city, country) {
  const prompt = `Real estate agent. List 12 notable neighbourhoods/districts in "${city}", ${country} for property search.
Return ONLY a valid JSON array of strings, no markdown:
["Area1","Area2",...]
Include prime central, up-and-coming, family-friendly, and investment zones.`;

  try {
    const result = await callGemini(prompt, { json: true, retries: 1 });
    if (Array.isArray(result) && result.length > 0) return result;
    throw new Error('Not an array');
  } catch {
    return [`Central ${city}`, `North ${city}`, `South ${city}`, `East ${city}`, `West ${city}`, `${city} City Centre`];
  }
}

// ── Agent 3: Search Intent Parser ────────────────────────────
export async function parseSearchIntent(query, context = {}) {
  const prompt = `Parse this property search query into structured filters.
Query: "${query}"
Country: ${context.country || 'UK'}, City context: ${context.city || 'unknown'}

Return ONLY valid JSON (no markdown):
{"city":null,"area":null,"type":null,"min_price":null,"max_price":null,"bedrooms":null,"key_features":[],"intent":"buy","refined_query":"${query}"}

Fill in values found in the query. type must be one of: Flat, Terraced House, Semi-Detached, Detached House, Bungalow, Maisonette, Studio, Penthouse, Commercial, Land — or null.
For prices, convert "£400k" to 400000, "£1.2m" to 1200000, etc.`;

  try {
    const result = await callGemini(prompt, { json: true, retries: 1 });
    return result && typeof result === 'object' ? result : { refined_query: query };
  } catch {
    return { refined_query: query, intent: 'explore' };
  }
}

// ── Agent 4: Map Pin Intelligence ────────────────────────────
export async function getMapAreaSuggestions(lat, lng, userIntent = '') {
  const prompt = `Location intelligence agent. Pin dropped at (${lat.toFixed(4)}, ${lng.toFixed(4)}).
User intent: "${userIntent || 'find nearby properties'}"

Return ONLY valid JSON:
{"area_name":"...","city":"...","facts":["fact1","fact2","fact3"],"best_for":["Flat","Terraced House"],"investment_score":7,"investment_reason":"...","search_radius_km":1}`;

  try {
    const result = await callGemini(prompt, { json: true, retries: 1, timeout: 10000 });
    return result && result.area_name ? result : defaultPinInfo();
  } catch {
    return defaultPinInfo();
  }
}
function defaultPinInfo() {
  return { area_name: 'Selected Location', city: 'Unknown', facts: ['Prime location selected', 'Properties available nearby', 'Good connectivity'], best_for: ['Flat', 'Terraced House'], investment_score: 7, investment_reason: 'Central location with good amenities', search_radius_km: 1 };
}

// ── Agent 5: Property Advisor ─────────────────────────────────
// FIX: conversation history formatted as plain text (not Gemini multi-turn), avoiding role confusion
export async function getAdvisorResponse(messages, context = {}) {
  const history = messages
    .slice(-10)
    .map(m => `${m.role === 'user' ? 'USER' : 'ADVISOR'}: ${m.text}`)
    .join('\n\n');

  const prompt = `You are an expert AI property advisor specialising in global real estate: investments, valuations, legal processes, market trends, and financing.
Current focus: ${context.country || 'Global market'}${context.city ? `, ${context.city}` : ''}.
Today's date: ${new Date().toLocaleDateString('en-GB')}.

Conversation:
${history}

Respond to the last USER message. Be expert, specific, and actionable. Use relevant metrics. For UK: reference SDLT, EPC, Help to Buy, freehold/leasehold. Write 3–4 clear paragraphs. No bullet lists.`;

  return callGemini(prompt, { retries: 2, timeout: 20000 });
}

// ── Agent 6: Price Prediction ─────────────────────────────────
export async function getPricePrediction(params) {
  const prompt = `You are an expert property valuation AI with comprehensive global real estate market knowledge.

Property to value:
- Country: ${params.country || 'UK'}, City: ${params.city}, Area: ${params.area || 'city centre'}
- Type: ${params.property_type}, Size: ${params.size_sqft ? params.size_sqft + ' sqft' : 'not specified'}
- Bedrooms: ${params.bedrooms || 'N/A'}, Bathrooms: ${params.bathrooms || 'N/A'}
- Age: ${params.age_years ? params.age_years + ' years' : 'not specified'}, Condition: ${params.condition || 'Good'}
- Floor: ${params.floor || 'N/A'}, Parking: ${params.parking || 'None'}, Garden: ${params.garden ? 'Yes' : 'No'}
- Extra features: ${params.features || 'none'}

Return ONLY valid JSON (no markdown, no trailing commas):
{"estimated_price":450000,"currency":"GBP","currency_symbol":"£","price_range_low":420000,"price_range_high":480000,"price_per_sqft":530,"confidence_pct":78,"estimated_monthly_rent":2100,"gross_rental_yield":5.6,"annual_growth_pct":4.2,"investment_rating":"Good","market_sentiment":"Rising","key_value_drivers":["driver1","driver2","driver3"],"risk_factors":["risk1","risk2"],"comparable_sales":[{"description":"Similar flat nearby","price":445000,"date":"Q4 2024"},{"description":"Premium version","price":465000,"date":"Q3 2024"}],"ai_analysis":"2-3 sentence expert analysis here.","stamp_duty":10000,"total_purchase_cost":470000}

Replace all example values with real estimates for the given property.`;

  try {
    const result = await callGemini(prompt, { json: true, retries: 2, timeout: 25000 });
    if (result && result.estimated_price) return result;
    throw new GeminiError('INVALID_RESULT', 'AI returned unexpected prediction format.');
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    throw new GeminiError('PREDICTION_FAILED', e.message);
  }
}

// ── Agent 7: Market Analysis ──────────────────────────────────
export async function getMarketAnalysis(params) {
  const prompt = `You are a real estate market analyst with comprehensive global market knowledge.

Analyse this market:
- Country: ${params.country || 'UK'}, City: ${params.city}, Area: ${params.area || 'city-wide'}
- Property focus: ${params.property_type || 'all types'}
- Investor profile: ${params.investor_profile || 'general buyer'}
- Budget: ${params.budget || 'all ranges'}
- Year: ${new Date().getFullYear()}

Return ONLY valid JSON (no markdown):
{"market_summary":"3-4 sentence overview","avg_price":350000,"avg_price_sqft":450,"currency_symbol":"£","price_change_1y_pct":5.2,"price_change_5y_pct":28.0,"avg_rental_yield":4.8,"demand_level":"High","supply_level":"Low","market_phase":"Growth","investment_score":7.5,"best_property_types":["Flat","Terraced House"],"top_growth_areas":[{"area":"Area name","growth_pct":8.5,"reason":"why"}],"key_drivers":[{"driver":"Driver name","impact":"Positive","magnitude":"High"}],"risks":[{"risk":"Risk name","severity":"Medium","timeline":"2025-2026"}],"upcoming_developments":[{"project":"Project name","impact":"Positive impact description","year":"2026"}],"buyer_advice":"Actionable paragraph for buyers.","investor_verdict":"Investment verdict paragraph.","price_forecast":{"1yr":5,"3yr":15,"5yr":28}}

Replace all example values with real analysis for the specified location.`;

  try {
    const result = await callGemini(prompt, { json: true, retries: 2, timeout: 25000 });
    if (result && result.market_summary) return result;
    throw new GeminiError('INVALID_RESULT', 'AI returned unexpected market analysis format.');
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    throw new GeminiError('ANALYSIS_FAILED', e.message);
  }
}

// ── Agent 8: Property Insight ─────────────────────────────────
export async function getPropertyInsight(property) {
  const prompt = `Investment analyst. 2-sentence assessment of this property:
${property.title} — ${property.area}, ${property.city}
Price: £${property.price?.toLocaleString()} | ${property.area_sqft} sqft | ${property.bedrooms || 0} bed | EPC ${property.epc_rating} | ${property.tenure}
Station: ${property.nearest_station} (${property.station_distance}) | Flood: ${property.flood_risk}

Sentence 1: Value vs market. Sentence 2: Key investment consideration. Be specific and direct.`;

  try {
    return await callGemini(prompt, { retries: 1, timeout: 10000 });
  } catch {
    return null;
  }
}

// ── Agent 9: Search Autocomplete ─────────────────────────────
export async function getSearchSuggestions(partial, country, city) {
  if (!partial || partial.length < 2) return [];
  const prompt = `Property search autocomplete. User typed: "${partial}" (${city || country || 'UK'}).
Return ONLY a JSON array of 5 search suggestions as strings. Mix areas, types, and complete queries.
Example format: ["2 bed flat in Shoreditch","Victorian terrace under £500k","Investment flat with parking"]
Return ONLY the JSON array, nothing else:`;

  try {
    const result = await callGemini(prompt, { json: true, retries: 0, timeout: 6000 });
    return Array.isArray(result) ? result.slice(0, 5) : [];
  } catch {
    return [];
  }
}

// ── Static data ───────────────────────────────────────────────
export const COUNTRY_CITY_FALLBACKS = {
  'United Kingdom': ['London','Manchester','Birmingham','Leeds','Edinburgh','Bristol','Liverpool','Oxford','Cambridge','Brighton','Cardiff','Glasgow','Nottingham','Sheffield','Newcastle'],
  'United States':  ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','Austin','Miami','Atlanta','Seattle','Denver','Boston'],
  'India':          ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad','Surat','Jaipur','Lucknow','Kochi','Chandigarh','Indore','Bhopal'],
  'Australia':      ['Sydney','Melbourne','Brisbane','Perth','Adelaide','Gold Coast','Canberra','Newcastle','Hobart','Darwin','Wollongong','Sunshine Coast','Geelong','Townsville','Cairns'],
  'Canada':         ['Toronto','Vancouver','Montreal','Calgary','Ottawa','Edmonton','Winnipeg','Quebec City','Hamilton','Halifax','Victoria','Kelowna','London','Windsor','Saskatoon'],
  'UAE':            ['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain'],
  'Singapore':      ['Central','Orchard','Marina Bay','Jurong','Tampines','Clementi','Woodlands','Bedok','Bishan','Ang Mo Kio'],
  'Germany':        ['Berlin','Munich','Hamburg','Frankfurt','Cologne','Düsseldorf','Stuttgart','Leipzig','Dortmund','Essen','Bremen','Dresden','Nuremberg','Hannover','Bonn'],
  'France':         ['Paris','Lyon','Marseille','Toulouse','Nice','Nantes','Strasbourg','Montpellier','Bordeaux','Lille'],
  'Spain':          ['Madrid','Barcelona','Valencia','Seville','Zaragoza','Málaga','Bilbao','Alicante','Palma','Las Palmas'],
  'Italy':          ['Rome','Milan','Naples','Turin','Palermo','Genoa','Bologna','Florence','Bari','Venice'],
  'Netherlands':    ['Amsterdam','Rotterdam','The Hague','Utrecht','Eindhoven','Tilburg','Groningen','Almere','Breda','Nijmegen'],
  'Portugal':       ['Lisbon','Porto','Braga','Setúbal','Coimbra','Funchal','Faro','Aveiro','Évora','Guimarães'],
  'Thailand':       ['Bangkok','Phuket','Chiang Mai','Pattaya','Koh Samui','Hua Hin','Nonthaburi','Khon Kaen','Chon Buri','Rayong'],
  'Malaysia':       ['Kuala Lumpur','Johor Bahru','Penang','Petaling Jaya','Shah Alam','Subang Jaya','Ipoh','Malacca','Kota Kinabalu','Kuching'],
  'Japan':          ['Tokyo','Osaka','Yokohama','Nagoya','Sapporo','Kobe','Kyoto','Fukuoka','Sendai','Hiroshima'],
  'South Africa':   ['Cape Town','Johannesburg','Durban','Pretoria','Port Elizabeth','Bloemfontein','Nelspruit','East London','Polokwane','Kimberley'],
  'Brazil':         ['São Paulo','Rio de Janeiro','Brasília','Salvador','Fortaleza','Belo Horizonte','Manaus','Curitiba','Recife','Porto Alegre'],
  'Mexico':         ['Mexico City','Guadalajara','Monterrey','Puebla','Tijuana','León','Juárez','Cancún','Playa del Carmen','Mérida'],
  'New Zealand':    ['Auckland','Wellington','Christchurch','Hamilton','Tauranga','Dunedin','Palmerston North','Napier','Nelson','Rotorua'],
};

export const SUPPORTED_COUNTRIES = Object.keys(COUNTRY_CITY_FALLBACKS);
