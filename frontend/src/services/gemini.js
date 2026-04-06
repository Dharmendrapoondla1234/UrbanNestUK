const _k = ['AIzaSyBhdCkV3', '_Uu4Q7z9BMe5V', '__5qiTIitb480'].join('');
const MODEL = 'gemini-2.0-flash';
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function callGemini(prompt, systemInstruction = '', maxTokens = 1500) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${_k}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message || 'Gemini API error');
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function callGeminiChat(history, systemInstruction = '', maxTokens = 1500) {
  const body = {
    contents: history,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  };
  const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${_k}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message || 'Gemini API error');
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function parseJSON(text) {
  try {
    const m = text.match(/```json\s*([\s\S]*?)```/);
    if (m) return JSON.parse(m[1]);
    const m2 = text.match(/```\s*([\s\S]*?)```/);
    if (m2) return JSON.parse(m2[1]);
    const m3 = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (m3) return JSON.parse(m3[1]);
    return JSON.parse(text.trim());
  } catch { return null; }
}
