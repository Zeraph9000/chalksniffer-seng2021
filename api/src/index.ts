import dotenv from 'dotenv';
import { connectDB } from './db';
import app from './app';
import { restoreRecurringJobs } from './utils/recurringOrderService';

dotenv.config();

const PORT = process.env.PORT ?? 3000;

connectDB(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/chalksniffer')
  .then(async () => {
    await restoreRecurringJobs();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });
