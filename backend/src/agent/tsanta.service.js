import { GoogleGenAI, Type } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './systemInstruction.js';
import { responseSchema } from './responseSchema.js';

// =======================
// 🔥 MÉMOIRE PAR USER
// =======================
const userMemory = new Map();
const MAX_HISTORY = 40;

// =======================
// 🔑 API KEYS
// =======================
const API_KEYS = (process.env.API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

if (!API_KEYS.length) {
  console.error("❌ No API keys found");
  process.exit(1);
}

// =======================
// 🤖 MODEL PRIORITY ORDER
// =======================
const MODELS = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash" // optionnel, stable gratuit
];

// =======================
// 🔄 UTILITIES
// =======================
const isQuotaError = (error) => {
  const msg = (error?.message || "").toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("exceeded") ||
    msg.includes("permission_denied") ||
    msg.includes("leaked")
  );
};

// =======================
// 🚀 CORE FUNCTION
// =======================
export async function generateAgentResponse(message, userId) {

  if (!userMemory.has(userId)) {
    userMemory.set(userId, []);
  }

  const history = userMemory.get(userId);

  // Parcours tous les modèles et clés
  for (let modelIndex = 0; modelIndex < MODELS.length; modelIndex++) {
    const currentModel = MODELS[modelIndex];

    for (let keyIndex = 0; keyIndex < API_KEYS.length; keyIndex++) {
      const apiKey = API_KEYS[keyIndex];
      const ai = new GoogleGenAI({ apiKey });

      try {
        console.log(`🤖 Trying Model: ${currentModel} | Key: ${keyIndex + 1}`);

        const contents = [
          ...history,
          { role: "user", parts: [{ text: message }] }
        ];

        const response = await ai.models.generateContent({
          model: currentModel,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.7
          }
        });

        const parsed = JSON.parse(response.text);

        // 🔥 Save user memory
        history.push(
          { role: "user", parts: [{ text: message }] },
          { role: "model", parts: [{ text: parsed.reply }] }
        );

        // 🔥 Limit memory
        if (history.length > MAX_HISTORY * 2) history.splice(0, 2);

        return parsed;

      } catch (error) {
        console.warn(`❌ Error with model ${currentModel} key ${keyIndex + 1}:`, error?.message || error);

        if (isQuotaError(error)) {
          console.log("⚠️ Quota or key issue → try next key");
          continue; // passe à la clé suivante
        } else {
          console.log("⚠️ Non-quota error → try next key");
          continue; // passe à la clé suivante
        }
      }
    }

    console.log(`⚠️ All keys failed for model ${currentModel} → Switching model`);
  }

  throw new Error("All models & keys exhausted or service temporarily unavailable");
}
