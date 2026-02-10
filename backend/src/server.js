// backend/src/server.js
import 'dotenv/config';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './agent/systemInstruction.js';

const app = express();
app.use(express.json());

// --- Configuration ---
const API_KEYS = (process.env.API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;
const MODEL_NAME = 'gemini-2.5-flash';

if (!API_KEYS.length) {
  console.error("❌ No API keys found. Please add API_KEY in your .env");
  process.exit(1);
}

const getClient = () => new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });
const rotateKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
};

// --- Response Schema ---
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

// --- Core Logic ---
async function generateAgentResponse(message, history = []) {
  let attempts = 0;

  while (attempts < API_KEYS.length) {
    try {
      const ai = getClient();
      const prompt = `User Message: ${message}`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.7
        }
      });

      return JSON.parse(response.text);

    } catch (error) {
      attempts++;
      rotateKey();
      if (attempts >= API_KEYS.length) throw error;
    }
  }
}

// --- API Endpoints ---
app.get('/', (_, res) => res.send('✅ TSANTA API is running'));

app.post('/api/agent/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({
        reply: "Veuillez fournir un message",
        intent: "unknown",
        detected_language: "mg",
        next_action: "none"
      });
    }

    const result = await generateAgentResponse(message, history || []);
    res.json(result);

  } catch (error) {
    console.error("❌ TSANTA Error:", error);
    res.status(500).json({
      reply: "Misy olana kely.",
      intent: "unknown",
      detected_language: "mg",
      next_action: "none"
    });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 TSANTA API running on port ${PORT}`));
