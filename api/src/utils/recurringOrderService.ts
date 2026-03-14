import cron, { ScheduledTask } from 'node-cron';
import RecurringOrderModel from '../models/recurringOrder';
import OrderModel from '../models/order';
import OrderXml from '../models/orderXml';
import { validateOrder } from './validation';
import { calculateMonetaryTotal } from './orderCalculations';
import { buildOrderXml } from './xmlBuilder';
import { Frequency, Order, RecurringOrderInstance } from '../types';

const INSTANCE_COUNT = 5;
const cronJobs = new Map<string, ScheduledTask>();

function toISOString(date: Date): string {
  return date.toISOString();
}

function advanceDate(date: Date, frequency: Frequency): void {
  if (frequency === 'Daily') {
    date.setDate(date.getDate() + 1);
  } else if (frequency === 'Weekly') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'Monthly') {
    date.setMonth(date.getMonth() + 1);
  }
}

function generateScheduledDates(startDate: string, frequency: Frequency, count: number): string[] {
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

function generateOrderInstances(
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
      order: instanceOrder,
      scheduledDate,
    };
  });
}

function replenishInstances(
  recurringOrder: any,
  frequency: Frequency,
  lastScheduledDate: string
): RecurringOrderInstance[] {
  const nextStartDate = new Date(lastScheduledDate);
  advanceDate(nextStartDate, frequency);

  const templateOrder = (recurringOrder.order.toJSON ? recurringOrder.order.toJSON() : recurringOrder.order) as Order;
  return generateOrderInstances(templateOrder, toISOString(nextStartDate), frequency);
}

async function executeNextInstance(recurringOrderId: string): Promise<void> {
  try {
    // Atomically pop the first instance to prevent race conditions
    const recurringOrder = await RecurringOrderModel.findOneAndUpdate(
      { 'id': recurringOrderId, 'orderInstances.0': { $exists: true } },
      { $pop: { orderInstances: -1 } },
      { returnDocument: 'before' }
    );
    if (!recurringOrder || recurringOrder.orderInstances.length === 0) return;

    const frequency = recurringOrder.frequency as Frequency;
    const instance = recurringOrder.orderInstances[0] as any;

    // Skip if this instance isn't due yet (re-push it back)
    if (new Date(instance.scheduledDate).getTime() > Date.now()) {
      await RecurringOrderModel.findOneAndUpdate(
        { id: recurringOrderId },
        { $push: { orderInstances: { $each: [instance], $position: 0 } } }
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
      console.error(`Recurring order ${recurringOrderId} instance validation failed:`, validation.errors);
      return;
    }

    await OrderModel.create({
      id: fullOrder.id,
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
        refreshed.orderInstances.push(...(newInstances as any));
        await refreshed.save();
      }
    }

    console.log(`Executed recurring order instance: ${fullOrder.id} for recurring order ${recurringOrderId}`);
  } catch (error) {
    console.error(`Error executing recurring order ${recurringOrderId}:`, error);
  }
}

function frequencyToCron(frequency: Frequency, startDate: string): string {
  const date = new Date(startDate);
  switch (frequency) {
    case 'Daily':
      return '0 0 * * *';
    case 'Weekly':
      return `0 0 * * ${date.getUTCDay()}`;
    case 'Monthly':
      return `0 0 ${date.getUTCDate()} * *`;
  }
}

function scheduleCronJob(recurringOrderId: string, frequency: Frequency, startDate: string): void {
  const existing = cronJobs.get(recurringOrderId);
  if (existing) {
    existing.stop();
  }

  const cronExpression = frequencyToCron(frequency, startDate);
  const task = cron.schedule(cronExpression, async () => {
    await executeNextInstance(recurringOrderId);
  });

  cronJobs.set(recurringOrderId, task);
  console.log(`Scheduled cron job for recurring order ${recurringOrderId} with expression ${cronExpression}`);
}

async function restoreRecurringJobs(): Promise<void> {
  const recurringOrders = await RecurringOrderModel.find({
    'orderInstances.0': { $exists: true },
  });

  for (const ro of recurringOrders) {
    scheduleCronJob(ro.id, ro.frequency as Frequency, ro.startDate);
  }

  console.log(`Restored ${recurringOrders.length} recurring order cron jobs`);
}

export {
  generateScheduledDates,
  generateOrderInstances,
  executeNextInstance,
  scheduleCronJob,
  restoreRecurringJobs,
  cronJobs,
};
