import mongoose from 'mongoose';

const userMapSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  apiKey: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

export const UserMap = mongoose.model('UserMap', userMapSchema);
