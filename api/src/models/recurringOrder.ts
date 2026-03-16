import mongoose from 'mongoose';
import type { RecurringOrder, RecurringOrderInstance } from '../types';
import { orderSchema } from './order';

const recurringOrderInstanceSchema = new mongoose.Schema<RecurringOrderInstance>({
  id: { type: String, required: true },
  order: { type: orderSchema, required: true },
  scheduledDate: { type: String, required: true },
}, { _id: false });

const recurringOrderSchema = new mongoose.Schema<RecurringOrder>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  order: { type: orderSchema, required: true },
  frequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], required: true },
  startDate: { type: String, required: true },
  orderInstances: { type: [recurringOrderInstanceSchema], required: true },
}, { timestamps: true, optimisticConcurrency: true });

const RecurringOrderModel = mongoose.model<RecurringOrder>('RecurringOrder', recurringOrderSchema);

export default RecurringOrderModel;
