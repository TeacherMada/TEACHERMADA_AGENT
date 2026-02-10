// backend/src/server.js
import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import agentRoute from './routes/agent.route.js';

const app = express();

/* =========================
   CONFIG
========================= */

const PORT = process.env.PORT || 3000;
const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

if (!PAGE_TOKEN || !VERIFY_TOKEN) {
  console.warn('⚠️ Missing Facebook PAGE_ACCESS_TOKEN or VERIFY_TOKEN');
}

app.use(express.json());

/* =========================
   ROUTES API AGENT
========================= */
app.use('/api/agent', agentRoute);

/* =========================
   ROOT + HEALTH
========================= */

app.get('/', (req, res) => {
  res.send('✅ TSANTA / TeacherMada API is running');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'TeacherMada-Agent' });
});

/* =========================
   FACEBOOK WEBHOOK VERIFY
========================= */

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Facebook Webhook verified');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* =========================
   FACEBOOK WEBHOOK EVENTS
========================= */

app.post('/webhook', async (req, res) => {
  const entry = req.body.entry?.[0];
  const event = entry?.messaging?.[0];

  if (!event || !event.sender || !event.message?.text) {
    return res.sendStatus(200);
  }

  const senderId = event.sender.id;
  const userMessage = event.message.text;

  try {
    // Call internal Agent API
    const apiRes = await fetch(
      `${process.env.BASE_URL}/api/agent/chat?prompt=${encodeURIComponent(userMessage)}&id=${senderId}`
    );

    const data = await apiRes.json();
    const reply = data?.response || "Désolé, je n'ai pas compris.";

    await sendFacebookMessage(senderId, reply);

  } catch (err) {
    console.error('❌ Messenger Error:', err);
    await sendFacebookMessage(senderId, '⚠️ Une erreur est survenue.');
  }

  res.sendStatus(200);
});

/* =========================
   SEND MESSAGE TO FB
========================= */

async function sendFacebookMessage(senderId, text) {
  if (!PAGE_TOKEN) return;

  await fetch(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: senderId },
        message: { text }
      })
    }
  );
}

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`🚀 TeacherMada Agent running on port ${PORT}`);
});
