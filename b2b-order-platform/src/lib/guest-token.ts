import crypto from "crypto";

export function generateGuestToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
