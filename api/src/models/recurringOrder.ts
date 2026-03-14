import mongoose from 'mongoose';
import { orderSchema } from './order';

const recurringOrderInstanceSchema = new mongoose.Schema({
  order: { type: orderSchema, required: true },
  scheduledDate: { type: String, required: true },
}, { _id: false });

const recurringOrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  order: { type: orderSchema, required: true },
  frequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], required: true },
  startDate: { type: String, required: true },
  orderInstances: { type: [recurringOrderInstanceSchema], required: true },
}, { timestamps: true });

const RecurringOrderModel = mongoose.model('RecurringOrder', recurringOrderSchema);

export default RecurringOrderModel;
