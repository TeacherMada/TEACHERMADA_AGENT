// backend/src/server.js
import 'dotenv/config';
import express from 'express';
import agentRoute from './routes/agent.route.js';

const app = express();
app.use(express.json());

/* ===============================
   🧠 Mémoire utilisateur (RAM)
================================ */
export const userMemory = new Map();

/**
 * Ajouter un message à la mémoire
 */
export function addToMemory(userId, role, text) {
  if (!userMemory.has(userId)) {
    userMemory.set(userId, []);
  }

  const history = userMemory.get(userId);

  history.push({
    role,
    parts: [{ text }]
  });

  // Limite mémoire (10 derniers échanges)
  if (history.length > 20) {
    history.shift();
  }

  userMemory.set(userId, history);
}

/**
 * Récupérer l’historique utilisateur
 */
export function getMemory(userId) {
  return userMemory.get(userId) || [];
}

/**
 * Reset mémoire utilisateur (optionnel)
 */
export function clearMemory(userId) {
  userMemory.delete(userId);
}

/* ===============================
   ✅ Health / Ping (UptimeRobot)
================================ */
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'TeacherMada Agent',
    status: 'ok',
    uptime: process.uptime()
  });
});

/* ===============================
   🤖 Routes Agent
================================ */
app.use('/api/agent', agentRoute);

/* ===============================
   🚀 Start Server
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 TeacherMada Agent running on port ${PORT}`);
});
