import dotenv from 'dotenv';
import { connectDB } from './db';
import app from './app';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/chalksniffer';

connectDB(MONGODB_URI).then(() => {
  if (!process.env.VERCEL) {
    const PORT = process.env.PORT ?? 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }
});

export default app;
