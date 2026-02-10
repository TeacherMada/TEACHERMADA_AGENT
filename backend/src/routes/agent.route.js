import express from 'express';
import { generateAgentResponse } from '../agent/tsanta.service.js';

const router = express.Router();

// --- POST endpoint existant ---
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    const result = await generateAgentResponse(message, history || []);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      reply: "Misy olana kely.",
      detected_language: "mg",
      intent: "unknown",
      next_action: "none"
    });
  }
});

// --- AJOUTER CE GET endpoint ---
router.get('/chat', async (req, res) => {
  try {
    const { prompt, id } = req.query;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Missing 'prompt' parameter"
      });
    }

    const result = await generateAgentResponse(prompt);

    return res.json({
      success: true,
      response: result.reply,
      contextId: id || null,
      meta: {
        intent: result.intent,
        lang: result.detected_language,
        next_action: result.next_action
      }
    });

  } catch (error) {
    console.error('GET /api/agent/chat error:', error);
    return res.status(500).json({
      success: false,
      response: "Erreur système. Réessayez plus tard."
    });
  }
});

export default router;
