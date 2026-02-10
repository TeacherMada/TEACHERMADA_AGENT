import { GoogleGenAI, Type } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './systemInstruction.js';

const API_KEYS = (process.env.API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

let currentKeyIndex = 0;
const MODEL_NAME = 'gemini-2.5-flash';

if (!API_KEYS.length) {
  throw new Error('❌ No API keys found');
}

const getClient = () =>
  new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });

const rotateKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    detected_language: { type: Type.STRING },
    intent: {
      type: Type.STRING,
      enum: ["greeting","info","learning","pricing","signup","unknown"]
    },
    next_action: {
      type: Type.STRING,
      enum: ["ask_question","present_offer","redirect_human","send_link","none"]
    }
  },
  required: ["reply","detected_language","intent","next_action"]
};

export async function generateAgentResponse(message, history = []) {
  let attempts = 0;

  while (attempts < API_KEYS.length) {
    try {
      const ai = getClient();

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
          ...history,
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.7
        }
      });

      return JSON.parse(response.text);

    } catch (err) {
      attempts++;
      rotateKey();
      if (attempts >= API_KEYS.length) throw err;
    }
  }
}
