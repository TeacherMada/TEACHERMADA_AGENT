import express from 'express';
import { generateAgentResponse } from '../agent/tsanta.service.js';

const router = express.Router();

/**
 * ❤️ HEALTH CHECK
 * GET /api/agent/health
 */
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'TeacherMada Agent API',
    agent: 'TSANTA',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * 🧠 GET CHAT (Browser / Messenger)
 * GET /api/agent/chat?prompt=salut&id=fb_123
 */
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
    console.error('GET /chat error:', error);
    return res.status(500).json({
      success: false,
      response: "Erreur système. Réessayez plus tard."
    });
  }
});

/**
 * 🧠 POST CHAT (Apps / Frontend)
 * POST /api/agent/chat
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({
        reply: "Message manquant.",
        detected_language: "fr",
        intent: "unknown",
        next_action: "none"
      });
    }

    const result = await generateAgentResponse(message, history || []);
    return res.json(result);

  } catch (error) {
    console.error('POST /chat error:', error);
    return res.status(500).json({
      reply: "Misy olana kely.",
      detected_language: "mg",
      intent: "unknown",
      next_action: "none"
    });
  }
});

export default router;
