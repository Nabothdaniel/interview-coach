import { MODEL_ID } from '../../src/engine/config';
import type { LlmPort } from '../../src/engine/ports';

export const KEY = process.env.GEMINI_API_KEY;
export const MODEL = process.env.GEMINI_MODEL ?? MODEL_ID;

export const llm: LlmPort = {
  async generateJson(req) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), req.timeoutMs);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY ?? '' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: 'user', parts: [{ text: req.user }] }],
          generationConfig: { temperature: req.temperature, responseMimeType: 'application/json', responseJsonSchema: req.responseSchema },
        }),
        signal: ctl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } finally {
      clearTimeout(t);
    }
  },
};

