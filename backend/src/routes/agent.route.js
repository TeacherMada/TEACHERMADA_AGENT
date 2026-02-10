import express from 'express';
import { generateAgentResponse } from '../agent/tsanta.service.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    const result = await generateAgentResponse(message, history);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      reply: 'Misy olana kely.',
      detected_language: 'mg',
      intent: 'unknown',
      next_action: 'none'
    });
  }
});

export default router;
