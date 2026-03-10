import express from 'express';
import { authRouter } from './routes/routers/auth';

const app = express();
app.use(express.json());

app.use('/auth', authRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
