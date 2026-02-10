import { Type } from '@google/genai';

export const responseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    detected_language: { type: Type.STRING },
    intent: { type: Type.STRING },
    next_action: { type: Type.STRING }
  },
  required: ['reply', 'detected_language', 'intent', 'next_action']
};
