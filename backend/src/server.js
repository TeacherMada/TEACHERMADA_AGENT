import 'dotenv/config';
import express from 'express';
import agentRoute from './routes/agent.route.js';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ TeacherMada / TSANTA API running');
});

app.use('/api/agent', agentRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
