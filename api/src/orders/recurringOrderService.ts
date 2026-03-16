import mongoose from 'mongoose';
import RecurringOrderModel from '../models/recurringOrder';
import OrderModel from '../models/order';
import OrderXml from '../models/orderXml';
import { validateOrder, ValidationError } from '../utils/validation';
import { calculateMonetaryTotal } from '../utils/orderHelpers';
import { buildOrderXml } from '../utils/xmlBuilder';
import { editOrderFmt, ErrorObject, Frequency, Order, RecurringOrderInstance, RecurringOrderResponse } from '../types';

const INSTANCE_COUNT = 5;

export function toISOString(date: Date): string {
  return date.toISOString();
}

export function advanceDate(date: Date, frequency: Frequency): void {
  if (frequency === 'Daily') {
    date.setDate(date.getDate() + 1);
  } else if (frequency === 'Weekly') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'Monthly') {
    date.setMonth(date.getMonth() + 1);
  }
}

export function generateScheduledDates(startDate: string, frequency: Frequency, count: number): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);

  for (let i = 0; i < count; i++) {
    if (i > 0) {
      advanceDate(current, frequency);
    }
    dates.push(toISOString(current));
  }

  return dates;
}

export function generateOrderInstances(
  templateOrder: Order,
  startDate: string,
  frequency: Frequency
): RecurringOrderInstance[] {
  const dates = generateScheduledDates(startDate, frequency, INSTANCE_COUNT);

  return dates.map((scheduledDate) => {
    const instanceOrder: Order = {
      ...templateOrder,
      id: crypto.randomUUID(),
      issueDate: scheduledDate.split('T')[0]!,
    };
    instanceOrder.anticipatedMonetaryTotal = calculateMonetaryTotal(instanceOrder);

    return {
      id: crypto.randomUUID(),
      order: instanceOrder,
      scheduledDate,
    };
  });
}

export function replenishInstances(
  recurringOrder: any,
  frequency: Frequency,
  lastScheduledDate: string
): RecurringOrderInstance[] {
  const nextStartDate = new Date(lastScheduledDate);
  advanceDate(nextStartDate, frequency);

  const templateOrder = (recurringOrder.order.toJSON ? recurringOrder.order.toJSON() : recurringOrder.order) as Order;
  return generateOrderInstances(templateOrder, toISOString(nextStartDate), frequency);
}

export async function deleteRecurringOrder(userId: string, id: string): Promise<{ message: string } | ErrorObject> {
  const recurringOrder = await RecurringOrderModel.findOne({ id });
  if (!recurringOrder) {
    return { error: 'INVALID_RECURRING_ORDER_ID', message: `Recurring order with ID ${id} does not exist` };
  }

  if (userId !== recurringOrder.userId) {
    return { error: 'FORBIDDEN', message: 'User does not own requested recurring order' };
  }

  await RecurringOrderModel.deleteOne({ id });
  return { message: `Recurring order ${id} deleted successfully` };
}

async function executeNextInstance(recurringOrderId: string): Promise<ErrorObject | void> {
  // Atomically pop the first instance to prevent race conditions
  const recurringOrder = await RecurringOrderModel.findOneAndUpdate(
    { 'id': recurringOrderId, 'orderInstances.0': { $exists: true } },
    { $pop: { orderInstances: -1 }, $inc: { __v: 1 } },
    { returnDocument: 'before' }
  );
  if (!recurringOrder || recurringOrder.orderInstances.length === 0) return;

  const frequency = recurringOrder.frequency as Frequency;
  const instance = recurringOrder.orderInstances[0] as any;

  // Skip if this instance isn't due yet (re-push it back)
  if (new Date(instance.scheduledDate).getTime() > Date.now()) {
    await RecurringOrderModel.findOneAndUpdate(
      { id: recurringOrderId },
      { $push: { orderInstances: { $each: [instance], $position: 0 } }, $inc: { __v: 1 } }
    );
    return;
  }

  const orderData = (instance.order.toJSON ? instance.order.toJSON() : instance.order) as Order;

  const orderId = crypto.randomUUID();
  const xmlUrl = `/orders/${orderId}/xml`;
  const fullOrder: Order = {
    ...orderData,
    id: orderId,
    issueDate: instance.scheduledDate.split('T')[0],
    anticipatedMonetaryTotal: calculateMonetaryTotal(orderData),
    createdAt: new Date().toISOString(),
    xmlUrl,
  };

  const validation = validateOrder(fullOrder);
  if (!validation.res) {
    return { error: 'INVALID_ORDER_DATA', message: `Validation failed for recurring order ${recurringOrderId}` };
  }

  await OrderModel.create({
    id: fullOrder.id,
    userId: recurringOrder.userId,
    issueDate: fullOrder.issueDate,
    documentCurrencyCode: fullOrder.documentCurrencyCode,
    buyerCustomerParty: fullOrder.buyerCustomerParty,
    sellerSupplierParty: fullOrder.sellerSupplierParty,
    orderLines: fullOrder.orderLines,
    anticipatedMonetaryTotal: fullOrder.anticipatedMonetaryTotal!,
    createdAt: new Date(),
    xmlUrl,
  });

  const xml = buildOrderXml(fullOrder);
  await OrderXml.create({ orderId: fullOrder.id, xml });

  // Auto-replenish if no instances remain (the pop already removed one, so check remaining count)
  // orderInstances.length - 1 because we got the 'before' document
  if (recurringOrder.orderInstances.length - 1 === 0) {
    const refreshed = await RecurringOrderModel.findOne({ id: recurringOrderId });
    if (refreshed) {
      const newInstances = replenishInstances(refreshed, frequency, instance.scheduledDate);
      await RecurringOrderModel.findOneAndUpdate(
        { id: recurringOrderId },
        { $push: { orderInstances: { $each: newInstances } }, $inc: { __v: 1 } }
      );
    }
  }
}

export async function getRecurringOrderInstance(
  recurringOrderId: string,
  userId: string,
  position: string
): Promise<{ status: number; body: any }> {
  const recurringOrder = await RecurringOrderModel.findOne({ id: recurringOrderId });
  if (!recurringOrder) {
    return { status: 400, body: { error: 'Recurring order does not exist' } };
  }

  if (userId !== recurringOrder.userId) {
    return { status: 403, body: { error: 'user does not own requested recurring order' } };
  }

  const pos = Number(position);
  if (!Number.isInteger(pos) || pos < 0 || pos >= recurringOrder.orderInstances.length) {
    return { status: 400, body: { error: `Invalid position ${position}. Must be an integer between 0 and ${recurringOrder.orderInstances.length - 1}` } };
  }

  return { status: 200, body: recurringOrder.orderInstances[pos] };
}

export async function editRecurringOrder(
  recurringOrderId: string,
  userId: string,
  updates: editOrderFmt
): Promise<{ status: number; body: any }> {
  const recurringOrder = await RecurringOrderModel.findOne({ id: recurringOrderId });
  if (!recurringOrder) {
    return { status: 400, body: { error: 'Recurring order does not exist' } };
  }
  if (userId !== recurringOrder.userId) {
    return { status: 403, body: { error: 'user does not own requested recurring order' } };
  }

  if (updates.note !== undefined) recurringOrder.order.note = updates.note;
  if (updates.delivery !== undefined) recurringOrder.order.delivery = updates.delivery;
  if (updates.orderLines !== undefined) recurringOrder.order.orderLines = updates.orderLines!;

  const validation = validateOrder(recurringOrder.order);
  if (!validation.res) {
    return { status: 400, body: { errors: validation.errors } };
  }
  recurringOrder.order.anticipatedMonetaryTotal = calculateMonetaryTotal(recurringOrder.order);

  for (const inst of recurringOrder.orderInstances) {
    if (updates.note !== undefined) inst.order.note = updates.note;
    if (updates.delivery !== undefined) inst.order.delivery = updates.delivery;
    if (updates.orderLines !== undefined) inst.order.orderLines = updates.orderLines!;
    inst.order.anticipatedMonetaryTotal = calculateMonetaryTotal(inst.order);
  }

  recurringOrder.markModified('orderInstances');
  recurringOrder.markModified('order');
  try {
    await recurringOrder.save();
  } catch (err) {
    if (err instanceof mongoose.Error.VersionError) {
      return { status: 409, body: { error: 'Conflict: the recurring order was modified concurrently. Please retry.' } };
    }
    throw err;
  }

  return { status: 200, body: recurringOrder };
}

export async function editInstance(
  recurringOrderId: string,
  userId: string,
  updates: editOrderFmt & { updateTemplate?: boolean }
): Promise<{ status: number; body: any }> {
  const recurringOrder = await RecurringOrderModel.findOne({ id: recurringOrderId });
  if (!recurringOrder) {
    return { status: 400, body: { error: 'Recurring order does not exist' } };
  }

  if (userId !== recurringOrder.userId) {
    return { status: 403, body: { error: 'user does not own requested recurring order' } };
  }

  if (!recurringOrder.orderInstances || recurringOrder.orderInstances.length === 0) {
    return { status: 400, body: { error: 'No pending instances to edit' } };
  }

  const instance = recurringOrder.orderInstances[0]!;

  if (updates.note !== undefined) {
    instance.order.note = updates.note;
  }
  if (updates.delivery !== undefined) {
    instance.order.delivery = updates.delivery;
  }
  if (updates.orderLines !== undefined) {
    instance.order.orderLines = updates.orderLines!;
  }

  const validation = validateOrder(instance.order);
  if (!validation.res) {
    return { status: 400, body: { errors: validation.errors } };
  }

  instance.order.anticipatedMonetaryTotal = calculateMonetaryTotal(instance.order);

  if (updates.updateTemplate === true) {
    if (updates.note !== undefined) {
      recurringOrder.order.note = updates.note;
    }
    if (updates.delivery !== undefined) {
      recurringOrder.order.delivery = updates.delivery;
    }
    if (updates.orderLines !== undefined) {
      recurringOrder.order.orderLines = updates.orderLines!;
    }
    recurringOrder.order.anticipatedMonetaryTotal = calculateMonetaryTotal(recurringOrder.order);
  }

  recurringOrder.markModified('orderInstances');
  recurringOrder.markModified('order');
  try {
    await recurringOrder.save();
  } catch (err) {
    if (err instanceof mongoose.Error.VersionError) {
      return { status: 409, body: { error: 'Conflict: the recurring order was modified concurrently. Please retry.' } };
    }
    throw err;
  }

  return { status: 200, body: instance };
}

export async function createRecurringOrder(userId: string, body: any): Promise<RecurringOrderResponse | { errors: { field: string; message: string }[] | ValidationError[] }> {
  const { frequency, startDate, ...orderBody } = body;

  const validFrequencies: Frequency[] = ['Daily', 'Weekly', 'Monthly'];
  if (!frequency || !validFrequencies.includes(frequency)) {
    return { errors: [{ field: 'frequency', message: 'must be one of: Daily, Weekly, Monthly' }] };
  }
  if (!startDate || isNaN(Date.parse(startDate))) {
    return { errors: [{ field: 'startDate', message: 'required and must be a valid date string (e.g. 2026-03-15T09:00:00Z or 2026-03-15)' }] };
  }

  const templateOrderId = crypto.randomUUID();
  const templateOrder: Order = {
    ...orderBody,
    userId,
    id: templateOrderId,
    issueDate: orderBody.issueDate || startDate.split('T')[0],
    anticipatedMonetaryTotal: calculateMonetaryTotal(orderBody),
  };

  const validation = validateOrder(templateOrder);
  if (!validation.res) return { errors: validation.errors };

  const recurringOrderId = crypto.randomUUID();
  const orderInstances = generateOrderInstances(templateOrder, startDate, frequency);

  await RecurringOrderModel.create({
    id: recurringOrderId,
    userId,
    order: templateOrder,
    frequency,
    startDate,
    orderInstances,
  });

  return { id: recurringOrderId, frequency, startDate, createdAt: new Date() };
}

export async function getRecurringOrder(userId: string, id: string) {
  const recurringOrder = await RecurringOrderModel.findOne({ id });
  if (!recurringOrder) {
    return { error: 'INVALID_RECURRING_ORDER_ID', message: `Recurring order with ID ${id} does not exist` } as ErrorObject;
  }

  if (userId !== recurringOrder.userId) {
    return { error: 'FORBIDDEN', message: 'User does not own requested recurring order' } as ErrorObject;
  }

  return {
    id: recurringOrder.id,
    userId: recurringOrder.userId,
    frequency: recurringOrder.frequency,
    startDate: recurringOrder.startDate,
    createdAt: recurringOrder.createdAt,
    order: recurringOrder.order,
    orderInstances: recurringOrder.orderInstances.map((inst: any) => ({
      id: inst.id,
      scheduledDate: inst.scheduledDate,
    })),
  };
}

export async function processAllRecurringOrders(): Promise<ErrorObject | void> {
  const recurringOrders = await RecurringOrderModel.find({
    'orderInstances.0': { $exists: true },
  });

  for (const ro of recurringOrders) {
    const result = await executeNextInstance(ro.id);
    if (result) return result;
  }
}
