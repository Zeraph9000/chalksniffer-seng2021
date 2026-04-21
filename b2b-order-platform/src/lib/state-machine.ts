import { OrderStatus } from "./types";

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed:     ["paid", "cancelled"],
  paid:       ["despatched", "cancelled"],
  despatched: ["received"],
  received:   ["invoiced"],
  invoiced:   [],
  cancelled:  [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
