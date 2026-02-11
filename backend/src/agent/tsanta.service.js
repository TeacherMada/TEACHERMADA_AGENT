// src/agent/tsanta.service.js
import { GoogleGenAI, Type } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './systemInstruction.js';

// --- Mémoire conversation déjà existante
const userMemory = {}; // { userId: [{role:'user', text:...}, ...] }

// --- Multi-model fallback
const providers = [
  {
    name: 'gemini-preview',
    model: 'gemini-2.5-flash-preview',
    keys: (process.env.GEMINI_KEYS || '').split(',').filter(Boolean),
    currentKeyIndex: 0
  },
  {
    name: 'gemini-pro',
    model: 'gemini-2.5-pro',
    keys: (process.env.GEMINI_KEYS || '').split(',').filter(Boolean),
    currentKeyIndex: 0
  },
  {
    name: 'gemini-flash',
    model: 'gemini-2.5-flash',
    keys: (process.env.GEMINI_KEYS || '').split(',').filter(Boolean),
    currentKeyIndex: 0
  },
  {
    name: 'openai',
    model: 'gpt-4o',
    keys: (process.env.OPENAI_KEYS || '').split(',').filter(Boolean),
    currentKeyIndex: 0
  }
];

// --- Rate limit
const rateLimit = {}; // { userId: { count: number, startTime: timestamp } }
const LIMIT = 60;
const WINDOW = 60*60*1000;

function checkUserLimit(userId) {
  const now = Date.now();
  if (!rateLimit[userId]) {
    rateLimit[userId] = { count: 1, startTime: now };
    return true;
  }
  const user = rateLimit[userId];
  if (now - user.startTime > WINDOW) {
    user.count = 1;
    user.startTime = now;
    return true;
  }
  if (user.count >= LIMIT) return false;
  user.count++;
  return true;
}

// --- Response Schema
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    detected_language: { type: Type.STRING },
    intent: { type: Type.STRING, enum: ["greeting","info","learning","pricing","signup","unknown"] },
    next_action: { type: Type.STRING, enum: ["ask_question","present_offer","redirect_human","send_link","none"] }
  },
  required: ["reply","detected_language","intent","next_action"]
};

// --- Core Logic
export async function generateAgentResponse(userId, message) {

  if (!checkUserLimit(userId)) {
    return {
      reply: "⛔ Voafetra ny fangatahanao. Andramo indray afaka ora iray.",
      intent: "unknown",
      detected_language: "mg",
      next_action: "none"
    };
  }

  // Init user memory
  if (!userMemory[userId]) userMemory[userId] = [];

  // History
  const history = [...userMemory[userId]];

  for (const provider of providers) {
    let attempts = 0;
    while (attempts < provider.keys.length) {
      try {
        const apiKey = provider.keys[provider.currentKeyIndex];
        provider.currentKeyIndex = (provider.currentKeyIndex + 1) % provider.keys.length;

        const ai = new GoogleGenAI({ apiKey });

        const prompt = `User Message: ${message}`;

        const response = await ai.models.generateContent({
          model: provider.model,
          contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.7
          }
        });

        const parsed = JSON.parse(response.text);

        // Update user memory
        userMemory[userId].push({ role:'user', text: message });
        userMemory[userId].push({ role:'assistant', text: parsed.reply });

        return parsed;

      } catch (e) {
        console.warn(`⚠️ Provider ${provider.name} key fail, rotating...`, e.message);
        attempts++;
      }
    }
    console.log(`⚠️ Switching to next provider: ${provider.name}`);
  }

  return {
    reply: "❌ Erreur système. Réessayez plus tard.",
    intent: "unknown",
    detected_language: "mg",
    next_action: "none"
  };
}
