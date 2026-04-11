/**
 * UrbanNest AI — Gemini 2.0 Flash Client (Frontend)
 * FIXED: Uses v1beta/gemini-2.0-flash — the working free-tier model.
 * DO NOT use v1/gemini-1.5-flash-latest — it is deprecated → 404.
 */

const KEY = import.meta.env.VITE_GEMINI_KEY || '';

// Priority order — 2.0-flash is the current default, 1.5-flash as fallback
const MODELS = [
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
];

// Rate limit: 1 concurrent request on free tier
let _busy = false;
const _queue = [];

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    _queue.push({ fn, resolve, reject });
    drain();
  });
}

function drain() {
  if (_busy || !_queue.length) return;
  const { fn, resolve, reject } = _queue.shift();
  _busy = true;
  fn()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      _busy = false;
      setTimeout(drain, 1000);  // 1s gap between requests
    });
}

export class GeminiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'GeminiError';
  }
}

async function _call(prompt, { json = false, temperature, maxTokens = 2048, timeout = 20000 } = {}) {
  if (!KEY?.trim()) {
    throw new GeminiError('API_KEY_MISSING',
      'Add VITE_GEMINI_KEY to your .env file. Get a free key at aistudio.google.com');
  }

  const temp = temperature ?? (json ? 0.05 : 0.7);
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: temp, maxOutputTokens: maxTokens },
  });

  let lastErr = null;

  for (const url of MODELS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);

      const res = await fetch(`${url}?key=${KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      // Model not available → try next
      if (res.status === 404 || res.status === 400) {
        const errBody = await res.json().catch(() => ({}));
        lastErr = new GeminiError('MODEL_NOT_FOUND', errBody?.error?.message || `HTTP ${res.status}`);
        continue;
      }

      if (res.status === 403) {
        const errBody = await res.json().catch(() => ({}));
        throw new GeminiError('AUTH_FAILED',
          `API key issue: ${errBody?.error?.message || 'Check key at aistudio.google.com'}`);
      }

      if (res.status === 429) {
        throw new GeminiError('RATE_LIMITED',
          'Free tier rate limit (60 req/min). Wait a moment and retry.');
      }

      if (!res.ok) {
        lastErr = new GeminiError('API_ERROR', `Gemini error ${res.status}`);
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!text) {
        lastErr = new GeminiError('EMPTY_RESPONSE', 'Gemini returned no text');
        continue;
      }

      if (!json) return text.trim();

      // Parse JSON
      const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      try { return JSON.parse(clean); }
      catch {
        const m = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (m) return JSON.parse(m[1]);
        throw new GeminiError('JSON_PARSE_ERROR', 'AI returned invalid JSON');
      }

    } catch (e) {
      if (e instanceof GeminiError && !['MODEL_NOT_FOUND', 'EMPTY_RESPONSE'].includes(e.code)) throw e;
      if (e.name === 'AbortError') { lastErr = new GeminiError('TIMEOUT', 'Request timed out'); continue; }
      if (!(e instanceof GeminiError)) { lastErr = new GeminiError('NETWORK_ERROR', e.message); continue; }
      lastErr = e;
    }
  }

  throw lastErr ?? new GeminiError('ALL_FAILED', 'All Gemini models unavailable');
}

export async function callGemini(prompt, options = {}) {
  return enqueue(() => _call(prompt, options));
}

// ── Specific AI features ──────────────────────────────────────────

export async function getAdvisorResponse(messages, { country = 'uk', city = null } = {}) {
  const history = messages.slice(-8)
    .map(m => `${m.role === 'user' ? 'USER' : 'ADVISOR'}: ${m.text}`)
    .join('\n\n');

  const prompt = `You are an expert property advisor for ${country.toUpperCase()} real estate.
${city ? `City focus: ${city}.` : ''} Date: ${new Date().toLocaleDateString('en-GB')}.

${history}

Reply as a knowledgeable advisor. 2-4 paragraphs, no bullet lists.
For UK: mention SDLT, EPC ratings, freehold/leasehold where relevant.
For India: mention RERA, stamp duty, carpet vs built-up area.`;

  return callGemini(prompt, { maxTokens: 800 });
}

export async function getMapAreaInfo(lat, lng, intent = '') {
  const prompt = `Property area analysis for pin at (${lat.toFixed(4)}, ${lng.toFixed(4)}).
User intent: "${intent || 'find properties'}"
Return ONLY JSON:
{"area_name":"name","city":"city","country":"uk or india","facts":["f1","f2","f3"],
"best_for":["Flat"],"investment_score":7,"investment_reason":"reason"}`;

  try {
    const r = await callGemini(prompt, { json: true, timeout: 12000 });
    return r?.area_name ? r : { area_name: 'Selected Location', city: '', facts: [], investment_score: 6 };
  } catch { return { area_name: 'Selected Location', city: '', facts: [], investment_score: 6 }; }
}

export async function generateAreasForCity(city, country) {
  const prompt = `List 10 property search neighbourhoods in "${city}", ${country}. JSON array only:
["Area1","Area2","Area3"]`;
  try {
    const r = await callGemini(prompt, { json: true });
    return Array.isArray(r) ? r : [];
  } catch { return []; }
}

export async function parseSearchQuery(query, country, city) {
  // For NL parsing, prefer backend (it has country config context)
  // This client-side version is a lightweight fallback
  const prompt = `Extract property search filters from: "${query}"
Country: ${country}, City: ${city || 'any'}
Return ONLY JSON: {"city":null,"area":null,"property_type":null,"max_price":null,
"bedrooms":null,"for_rent":null,"amenities":[],"refined_query":"${query}"}`;
  try {
    return await callGemini(prompt, { json: true, temperature: 0.05 });
  } catch { return { refined_query: query }; }
}
