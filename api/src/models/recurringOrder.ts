import mongoose from 'mongoose';
import { orderSchema } from './order';

const recurringOrderInstanceSchema = new mongoose.Schema({
  order: { type: orderSchema, required: true },
  scheduledDate: { type: String, required: true },
  executed: { type: Boolean, default: false },
}, { _id: false });

const recurringOrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  order: { type: orderSchema, required: true },
  frequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], required: true },
  startDate: { type: String, required: true },
  nextInstanceIndex: { type: Number, default: 0 },
  orderInstances: { type: [recurringOrderInstanceSchema], required: true },
}, { timestamps: true });

const RecurringOrderModel = mongoose.model('RecurringOrder', recurringOrderSchema);

export default RecurringOrderModel;
