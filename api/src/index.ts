import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './db';
import app from './app';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/chalksniffer';

// Ensure DB is connected before each request (safe for both serverless and long-running)
app.use(async (_req, _res, next) => {
  if (mongoose.connection.readyState === 0) {
    await connectDB(MONGODB_URI);
  }
  next();
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT ?? 3000;
  connectDB(MONGODB_URI).then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });
}

export default app;
