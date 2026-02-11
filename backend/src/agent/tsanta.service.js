import { GoogleGenAI, Type } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './systemInstruction.js';
import { responseSchema } from './responseSchema.js';

// =======================
// 🔥 MÉMOIRE PAR USER
// =======================
const userMemory = new Map();
const MAX_HISTORY = 20;

const API_KEYS = (process.env.API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

let currentKeyIndex = 0;
const MODEL_NAME = 'gemini-2.5-flash';

if (!API_KEYS.length) {
  console.error("❌ No API keys found");
  process.exit(1);
}

const getClient = () =>
  new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });

const rotateKey = () =>
  (currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length);

// =======================
// CORE FUNCTION
// =======================
export async function generateAgentResponse(message, userId) {

  if (!userMemory.has(userId)) {
    userMemory.set(userId, []);
  }

  const history = userMemory.get(userId);

  let attempts = 0;

  while (attempts < API_KEYS.length) {
    try {

      const ai = getClient();

      const contents = [
        ...history,
        { role: "user", parts: [{ text: message }] }
      ];

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.7
        }
      });

      const parsed = JSON.parse(response.text);

      // 🔥 Sauvegarde historique
      history.push(
        { role: "user", parts: [{ text: message }] },
        { role: "model", parts: [{ text: parsed.reply }] }
      );

      // 🔥 Limite mémoire
      if (history.length > MAX_HISTORY * 2) {
        history.splice(0, 2);
      }

      return parsed;

    } catch (error) {
      attempts++;
      rotateKey();
      if (attempts >= API_KEYS.length) throw error;
    }
  }
}
