import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
  apiKey: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

export const ApiKey = mongoose.model('ApiKey', apiKeySchema);
