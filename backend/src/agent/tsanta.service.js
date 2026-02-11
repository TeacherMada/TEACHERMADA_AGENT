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
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash"
];

let currentModelIndex = 0;
let currentKeyIndex = 0;

// =======================
// 🔄 UTILITIES
// =======================
const getClient = () =>
  new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });

const rotateKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
};

const rotateModel = () => {
  currentModelIndex++;
  currentKeyIndex = 0; // reset keys for new model
};

const isQuotaError = (error) => {
  const msg = error?.message?.toLowerCase() || "";
  return (
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("exceeded")
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

  // Nombre total de tentatives possibles
  const maxAttempts = MODELS.length * API_KEYS.length;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {

      const ai = getClient();
      const currentModel = MODELS[currentModelIndex];

      console.log(`🤖 Trying Model: ${currentModel} | Key: ${currentKeyIndex + 1}`);

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

      // 🔥 SAVE MEMORY
      history.push(
        { role: "user", parts: [{ text: message }] },
        { role: "model", parts: [{ text: parsed.reply }] }
      );

      // 🔥 LIMIT MEMORY
      if (history.length > MAX_HISTORY * 2) {
        history.splice(0, 2);
      }

      return parsed;

    } catch (error) {

      attempts++;

      console.error("❌ Error:", error.message);

      if (isQuotaError(error)) {
        console.log("⚠️ Quota reached → Rotating Key");

        rotateKey();

        // Si on revient à la clé 0 → toutes clés testées
        if (currentKeyIndex === 0) {
          console.log("⚠️ All keys exhausted → Switching Model");
          rotateModel();
        }

      } else {
        // Si erreur non quota → ne pas bloquer
        rotateKey();
      }

      // Si plus de modèles disponibles
      if (currentModelIndex >= MODELS.length) {
        throw new Error("All models & keys exhausted");
      }
    }
  }

  throw new Error("Service temporarily unavailable");
}
