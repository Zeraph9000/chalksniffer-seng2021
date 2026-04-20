import mongoose from 'mongoose';
import type { store } from '../types';

const storeSchema = new mongoose.Schema<store>({
  storeId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  storeName: { type: String, required: true },
  description: { type: String, required: true },
  logoUrl: String,
  bannerUrl: String,
  location: String,
  category: String,
  status: { type: String, enum: ['active', 'paused', 'closed'], required: true },
}, { timestamps: true });

const StoreModel = mongoose.model<store>('Store', storeSchema);

export default StoreModel;
