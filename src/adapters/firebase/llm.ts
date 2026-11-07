import type { FirebaseApp } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { MODEL_ID } from '../../engine/config';
import type { LlmPort } from '../../engine/ports';

/** Gemini via Firebase AI Logic (Gemini Developer API backend). No API key in the client; App Check must be initialised first. */
export function createFirebaseLlm(app: FirebaseApp, modelId: string = MODEL_ID): LlmPort {
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return {
    async generateJson(req) {
      const model = getGenerativeModel(
        ai,
        {
          model: modelId,
          systemInstruction: req.system,
          generationConfig: {
            temperature: req.temperature,
            responseMimeType: 'application/json',
            responseJsonSchema: req.responseSchema as Record<string, unknown>,
          },
        },
        { timeout: req.timeoutMs },
      );
      try {
        const result = await model.generateContent(req.user);
        return result.response.text();
      } catch (e) {
        // SDK error code/message only (never the prompt or answer text), so setup problems are diagnosable.
        const err = e as { code?: string; message?: string };
        console.error('[ai-logic]', err.code ?? 'unknown', (err.message ?? '').slice(0, 300));
        throw e;
      }
    },
  };
}
