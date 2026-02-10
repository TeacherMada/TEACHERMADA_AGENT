import express from 'express';
import dotenv from 'dotenv';
import agentRoute from './routes/agent.route.js';

dotenv.config();

const app = express();
app.use(express.json());

// Health check
app.get('/', (_, res) => {
  res.send('TSANTA API is running');
});

// API route
app.use('/api/agent', agentRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`TSANTA API running on port ${PORT}`)
);
