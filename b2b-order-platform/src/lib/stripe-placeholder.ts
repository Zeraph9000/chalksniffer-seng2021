import crypto from "crypto";

/**
 * Stripe placeholder — mocks successful charge + refund.
 * Replace these calls with real Stripe PaymentIntent API when integrating.
 */
export const stripePlaceholder = {
  createPaymentIntent(_amount: number, _currency: string): { id: string; clientSecret: string } {
    const id = `pi_placeholder_${crypto.randomBytes(8).toString("hex")}`;
    return { id, clientSecret: `${id}_secret_mock` };
  },
  confirmPayment(_intentId: string): { ok: true } {
    // In prod: Stripe webhook validates + returns actual state
    return { ok: true };
  },
  refund(_intentId: string): { ok: true; refundId: string } {
    return { ok: true, refundId: `re_placeholder_${crypto.randomBytes(8).toString("hex")}` };
  },
};
