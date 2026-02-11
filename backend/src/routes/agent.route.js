import express from 'express';
import { generateAgentResponse } from '../agent/tsanta.service.js';

const router = express.Router();

// GET endpoint (Messenger compatible)
router.get('/chat', async (req, res) => {
  try {

    const { prompt, id } = req.query;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        response: 'Paramètre "prompt" manquant'
      });
    }

    const userId = id || "anonymous";

    const result = await generateAgentResponse(prompt, userId);

    res.json({
      success: true,
      user_id: userId,
      response: result.reply,
      intent: result.intent,
      language: result.detected_language,
      next_action: result.next_action
    });

  } catch (error) {
    console.error("❌ Route Error:", error);
    res.status(500).json({
      success: false,
      response: "Erreur système. Réessayez plus tard."
    });
  }
});

export default router;
