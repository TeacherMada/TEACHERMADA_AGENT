import express from 'express';
import { generateAgentResponse } from '../agent/tsanta.service.js';

const router = express.Router();

/* =========================
   HEALTH
========================= */
router.get('/health', (req, res) => {
  res.json({ success: true, service: 'agent', status: 'ok' });
});

/* =========================
   CHAT (GET)
========================= */
router.get('/chat', async (req, res) => {
  const { prompt, id } = req.query;

  if (!prompt) {
    return res.status(400).json({
      success: false,
      response: 'Paramètre "prompt" manquant'
    });
  }

  try {
    const result = await generateAgentResponse(prompt, []);

    res.json({
      success: true,
      user_id: id || null,
      response: result.reply,
      intent: result.intent,
      language: result.detected_language,
      next_action: result.next_action
    });

  } catch (err) {
    console.error('❌ Agent Error:', err.message);

    res.status(500).json({
      success: false,
      response: 'Erreur système. Réessayez plus tard.'
    });
  }
});

export default router;
