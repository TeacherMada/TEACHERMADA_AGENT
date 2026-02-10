import { GoogleGenAI, Type } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './systemInstruction.js';
import { responseSchema } from './responseSchema.js';

const API_KEYS = (process.env.API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

let currentKeyIndex = 0;
const MODEL_NAME = 'gemini-2.5-flash';

const getClient = () => new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });
const rotateKey = () => (currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length);

export async function generateAgentResponse(message, history = []) {
  try {
    const ai = getClient();
    const prompt = `User message: ${message}`;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.7
      }
    });

    return JSON.parse(response.text);
  } catch (err) {
    rotateKey();
    throw err;
  }
}
