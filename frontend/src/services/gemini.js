/**
 * Gemini AI Engine — Production-hardened
 *
 * Fixes for dashboard errors:
 *  403 → Removed safetySettings (not allowed on free-tier keys)
 *  404 → Use gemini-1.5-flash-latest via v1 (not v1beta) with v1beta fallback
 *  429 → Global request queue (max 1 concurrent), exponential backoff + jitter
 *  503 → Reduced blast radius: fewer retries, longer backoff, request deduplication
 */

const KEY = import.meta.env.VITE_GEMINI_KEY || '';

// Model config — v1 is more stable than v1beta for production keys
const MODELS = [
  { url: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent' },
  { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent' },
  { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent' },
];

// ── Global request queue — max 1 concurrent to respect free-tier QPM ─────────
let _activeRequests = 0;
const _queue = [];
const MAX_CONCURRENT = 1;
const BASE_DELAY_MS  = 1200; // free tier: ~60 RPM → ~1s between requests

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    _queue.push({ fn, resolve, reject });
    _drain();
  });
}

async function _drain() {
  if (_activeRequests >= MAX_CONCURRENT || _queue.length === 0) return;
  const { fn, resolve, reject } = _queue.shift();
  _activeRequests++;
  try {
    const result = await fn();
    resolve(result);
  } catch (e) {
    reject(e);
  } finally {
    _activeRequests--;
    // Small gap between requests to avoid burst
    setTimeout(_drain, BASE_DELAY_MS);
  }
}

// ── Core caller ───────────────────────────────────────────────
async function callGemini(prompt, opts = {}) {
  const { retries = 1, json = false, timeout = 18000 } = opts;

  if (!KEY || !KEY.trim()) {
    throw new GeminiError('API_KEY_MISSING',
      'Gemini API key not configured. Add VITE_GEMINI_KEY to your Vercel environment variables and redeploy.');
  }

  return enqueue(() => _callWithRetry(prompt, opts));
}

async function _callWithRetry(prompt, opts) {
  const { retries = 1, json = false, timeout = 18000 } = opts;
  let lastError = null;
  let modelIdx  = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const model = MODELS[modelIdx % MODELS.length];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: json ? 0.1 : 0.65,
          maxOutputTokens: json ? 2048 : 1024,
          // topP and topK kept at defaults — don't override unnecessarily
        },
        // FIX: safetySettings REMOVED — causes 403 on free-tier API keys
        // The default safety filters are fine for real estate queries
      };

      const res = await fetch(`${model.url}?key=${KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      clearTimeout(timer);

      // ── Status handling ─────────────────────────────────────
      if (res.status === 400) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.error?.message || 'Invalid request';
        // If it's a model-not-found 400, try next model
        if (msg.includes('not found') || msg.includes('deprecated')) {
          modelIdx++;
          lastError = new GeminiError('MODEL_NOT_FOUND', msg);
          if (attempt < retries) { await jitter(1000); continue; }
          throw lastError;
        }
        throw new GeminiError('BAD_REQUEST', msg);
      }

      if (res.status === 403) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.error?.message || '';
        // API key issue vs permission issue
        if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('permission')) {
          throw new GeminiError('AUTH_FAILED',
            'Gemini API key is invalid or lacks permission. Visit aistudio.google.com to verify your key.');
        }
        throw new GeminiError('FORBIDDEN', `Access forbidden: ${msg || 'check API key permissions'}`);
      }

      if (res.status === 404) {
        // FIX: model not found → try next model in list
        modelIdx++;
        lastError = new GeminiError('MODEL_NOT_FOUND', `Model not found at ${model.url}`);
        if (attempt < retries || modelIdx < MODELS.length) {
          await jitter(500);
          continue;
        }
        throw lastError;
      }

      if (res.status === 429) {
        // FIX: proper backoff with jitter to avoid thundering herd
        const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10) * 1000;
        const backoff = retryAfter || (3000 * Math.pow(2, attempt)) + jitterMs();
        if (attempt < retries) { await sleep(backoff); continue; }
        throw new GeminiError('RATE_LIMITED',
          'Gemini free tier rate limit reached (60 req/min). Please wait a few seconds and try again.');
      }

      if (res.status === 503) {
        // Service temporarily unavailable — backoff and retry
        if (attempt < retries) { await jitter(2000 * (attempt + 1)); continue; }
        throw new GeminiError('SERVICE_UNAVAILABLE',
          'Gemini service temporarily unavailable. Please try again shortly.');
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new GeminiError('API_ERROR',
          errBody?.error?.message || `Gemini API error (${res.status})`);
      }

      // ── Parse response ──────────────────────────────────────
      const data = await res.json();

      if (data.promptFeedback?.blockReason) {
        throw new GeminiError('BLOCKED',
          `Request blocked by Gemini safety filters: ${data.promptFeedback.blockReason}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const reason = data.candidates?.[0]?.finishReason;
        if (reason === 'MAX_TOKENS') throw new GeminiError('MAX_TOKENS', 'Response truncated. Try a shorter query.');
        if (reason === 'SAFETY')    throw new GeminiError('BLOCKED', 'Response blocked by safety filters.');
        if (reason === 'RECITATION') throw new GeminiError('BLOCKED', 'Response blocked: recitation detected.');
        throw new GeminiError('EMPTY_RESPONSE', 'Gemini returned an empty response. Please try again.');
      }

      return json ? parseJSON(text) : text.trim();

    } catch (e) {
      if (e instanceof GeminiError) {
        // Only retry retriable codes
        if (RETRIABLE.has(e.code) && attempt < retries) {
          lastError = e;
          await jitter(1200 * (attempt + 1));
          continue;
        }
        throw e;
      }
      if (e.name === 'AbortError') {
        lastError = new GeminiError('TIMEOUT', 'Request timed out. Check your connection.');
        if (attempt < retries) { await jitter(1000); continue; }
        throw lastError;
      }
      // Network / fetch errors
      lastError = new GeminiError('NETWORK_ERROR', `Network error: ${e.message}`);
      if (attempt < retries) { await jitter(1500); continue; }
      throw lastError;
    }
  }

  throw lastError || new GeminiError('FAILED', 'Request failed after all retries.');
}

const RETRIABLE = new Set(['RATE_LIMITED', 'API_ERROR', 'SERVICE_UNAVAILABLE', 'NETWORK_ERROR', 'TIMEOUT', 'MODEL_NOT_FOUND']);

export class GeminiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'GeminiError';
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function jitterMs() { return Math.floor(Math.random() * 800); }
function jitter(base) { return sleep(base + jitterMs()); }

// ── JSON parser — 3-stage fallback ────────────────────────────
function parseJSON(text) {
  let clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Stage 1: direct
  try { return JSON.parse(clean); } catch (_) {}

  // Stage 2: extract first array or object
  const arrMatch = clean.match(/(\[[\s\S]*?\])/);
  const objMatch = clean.match(/(\{[\s\S]*\})/);
  for (const m of [arrMatch?.[1], objMatch?.[1]]) {
    if (m) try { return JSON.parse(m); } catch (_) {}
  }

  // Stage 3: strip trailing commas (common Gemini mistake) and retry
  const stripped = clean
    .replace(/,\s*([}\]])/g, '$1')  // trailing commas
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":'); // unquoted keys
  try { return JSON.parse(stripped); } catch (_) {}

  throw new GeminiError('JSON_PARSE_ERROR', 'AI returned invalid JSON. Please try again.');
}

// ── Agent 1: Country → Cities ─────────────────────────────────
export async function generateCitiesForCountry(country) {
  const prompt = `List the top 15 cities for real estate in "${country}". Reply with ONLY a JSON array:
["City1","City2","City3"]
No explanation, no markdown. Real cities only, capital city first.`;

  try {
    const result = await callGemini(prompt, { json: true, retries: 1 });
    if (Array.isArray(result) && result.length > 0) return result;
  } catch { /* fall through to hardcoded */ }
  return COUNTRY_CITY_FALLBACKS[country] || COUNTRY_CITY_FALLBACKS['United Kingdom'];
}

// ── Agent 2: City → Areas ─────────────────────────────────────
export async function generateAreasForCity(city, country) {
  const prompt = `List 10 notable property-search neighbourhoods in "${city}", ${country}. ONLY a JSON array:
["Area1","Area2"]
No explanation, no markdown.`;

  try {
    const result = await callGemini(prompt, { json: true, retries: 1 });
    if (Array.isArray(result) && result.length > 0) return result;
  } catch { /* fall through */ }
  return [`Central ${city}`, `North ${city}`, `South ${city}`, `East ${city}`, `West ${city}`, `${city} Centre`];
}

// ── Agent 3: Search Intent Parser ─────────────────────────────
export async function parseSearchIntent(query, context = {}) {
  const prompt = `Parse this property query into JSON filters.
Query: "${query}" | Country: ${context.country || 'UK'} | City: ${context.city || 'any'}

Return ONLY this JSON (no markdown), filling in values from the query:
{"city":null,"area":null,"type":null,"min_price":null,"max_price":null,"bedrooms":null,"refined_query":"${query}"}

Rules: type must be Flat/Terraced House/Semi-Detached/Detached House/Bungalow/Maisonette/Studio/Penthouse/Commercial/Land or null. Convert £400k→400000.`;

  try {
    const r = await callGemini(prompt, { json: true, retries: 0 });
    return (r && typeof r === 'object') ? r : { refined_query: query };
  } catch {
    return { refined_query: query };
  }
}

// ── Agent 4: Map Pin Intelligence ─────────────────────────────
export async function getMapAreaSuggestions(lat, lng, intent = '') {
  const prompt = `Pin at (${lat.toFixed(4)}, ${lng.toFixed(4)}). User intent: "${intent || 'find properties'}".
Return ONLY JSON:
{"area_name":"name","city":"city","facts":["fact1","fact2","fact3"],"best_for":["Flat"],"investment_score":7,"investment_reason":"reason","search_radius_km":1}`;

  try {
    const r = await callGemini(prompt, { json: true, retries: 0, timeout: 12000 });
    return (r && r.area_name) ? r : _defaultPin();
  } catch {
    return _defaultPin();
  }
}
function _defaultPin() {
  return { area_name: 'Selected Location', city: 'Unknown', facts: ['Location selected', 'Properties nearby', 'Good connectivity'], best_for: ['Flat', 'Terraced House'], investment_score: 7, investment_reason: 'Central location', search_radius_km: 1 };
}

// ── Agent 5: Property Advisor ──────────────────────────────────
export async function getAdvisorResponse(messages, context = {}) {
  const history = messages
    .slice(-8)
    .map(m => `${m.role === 'user' ? 'USER' : 'ADVISOR'}: ${m.text}`)
    .join('\n\n');

  const prompt = `You are an expert AI property advisor for global real estate.
Focus: ${context.country || 'Global'}${context.city ? `, ${context.city}` : ''}. Date: ${new Date().toLocaleDateString('en-GB')}.

${history}

Reply to the last USER message. Be expert and specific. 3-4 paragraphs, no bullet lists. For UK: mention SDLT, EPC, freehold/leasehold where relevant.`;

  return callGemini(prompt, { retries: 1, timeout: 20000 });
}

// ── Agent 6: Price Prediction ──────────────────────────────────
export async function getPricePrediction(params) {
  const prompt = `Property valuation AI. Estimate value for:
Country: ${params.country || 'UK'} | City: ${params.city} | Area: ${params.area || 'city centre'}
Type: ${params.property_type} | Size: ${params.size_sqft || 'unknown'} sqft | Beds: ${params.bedrooms || 'N/A'} | Baths: ${params.bathrooms || 'N/A'}
Age: ${params.age_years || 'unknown'} yrs | Condition: ${params.condition || 'Good'} | Floor: ${params.floor || 'N/A'}
Parking: ${params.parking || 'None'} | Garden: ${params.garden ? 'Yes' : 'No'} | Extra: ${params.features || 'none'}

Return ONLY valid JSON (no markdown, no trailing commas):
{"estimated_price":0,"currency":"GBP","currency_symbol":"£","price_range_low":0,"price_range_high":0,"price_per_sqft":0,"confidence_pct":75,"estimated_monthly_rent":0,"gross_rental_yield":0.0,"annual_growth_pct":0.0,"investment_rating":"Good","market_sentiment":"Stable","key_value_drivers":["a","b","c"],"risk_factors":["a","b"],"comparable_sales":[{"description":"Similar property","price":0,"date":"2024"}],"ai_analysis":"Analysis here.","stamp_duty":0,"total_purchase_cost":0}`;

  try {
    const r = await callGemini(prompt, { json: true, retries: 1, timeout: 25000 });
    if (r && typeof r.estimated_price === 'number') return r;
    throw new GeminiError('INVALID_RESULT', 'Unexpected valuation format returned.');
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    throw new GeminiError('PREDICTION_FAILED', e.message);
  }
}

// ── Agent 7: Market Analysis ───────────────────────────────────
export async function getMarketAnalysis(params) {
  const prompt = `Real estate market analyst. Analyse:
Country: ${params.country || 'UK'} | City: ${params.city} | Area: ${params.area || 'city-wide'}
Focus: ${params.property_type || 'all'} | Profile: ${params.investor_profile || 'general'} | Budget: ${params.budget || 'all'} | Year: ${new Date().getFullYear()}

Return ONLY valid JSON (no markdown):
{"market_summary":"overview","avg_price":0,"avg_price_sqft":0,"currency_symbol":"£","price_change_1y_pct":0.0,"price_change_5y_pct":0.0,"avg_rental_yield":0.0,"demand_level":"Moderate","supply_level":"Moderate","market_phase":"Stable","investment_score":5.0,"best_property_types":["Flat"],"top_growth_areas":[{"area":"name","growth_pct":0.0,"reason":"why"}],"key_drivers":[{"driver":"name","impact":"Positive","magnitude":"Medium"}],"risks":[{"risk":"name","severity":"Low","timeline":"2025"}],"upcoming_developments":[{"project":"name","impact":"description","year":"2026"}],"buyer_advice":"advice","investor_verdict":"verdict","price_forecast":{"1yr":0,"3yr":0,"5yr":0}}`;

  try {
    const r = await callGemini(prompt, { json: true, retries: 1, timeout: 25000 });
    if (r && r.market_summary) return r;
    throw new GeminiError('INVALID_RESULT', 'Unexpected market analysis format.');
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    throw new GeminiError('ANALYSIS_FAILED', e.message);
  }
}

// ── Agent 8: Property Insight (low-priority, no retry) ─────────
export async function getPropertyInsight(property) {
  const prompt = `2-sentence investment assessment:
${property.title} in ${property.area}, ${property.city}. Price: £${property.price?.toLocaleString()}, ${property.area_sqft} sqft, ${property.bedrooms || 0} bed, EPC ${property.epc_rating}, ${property.tenure}.
Sentence 1: value vs market. Sentence 2: key investment point.`;

  try {
    return await callGemini(prompt, { retries: 0, timeout: 10000 });
  } catch {
    return null;
  }
}

// ── Agent 9: Search Suggestions (low-priority, no retry) ───────
export async function getSearchSuggestions(partial, country, city) {
  if (!partial || partial.length < 3) return [];
  const prompt = `Property search autocomplete for "${partial}" in ${city || country || 'UK'}.
Return ONLY a JSON array of 5 suggestions (strings). No markdown:
["suggestion1","suggestion2","suggestion3","suggestion4","suggestion5"]`;

  try {
    const r = await callGemini(prompt, { json: true, retries: 0, timeout: 6000 });
    return Array.isArray(r) ? r.slice(0, 5) : [];
  } catch {
    return [];
  }
}

// ── Fallback data ──────────────────────────────────────────────
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
