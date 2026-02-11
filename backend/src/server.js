import 'dotenv/config';
import express from 'express';
import agentRoute from './routes/agent.route.js';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ success: true, service: "TSANTA API", status: "ok" });
});

app.use('/api/agent', agentRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
