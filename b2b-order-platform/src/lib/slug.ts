import { Db } from "mongodb";
import { Store } from "./types";

export const RESERVED_SLUGS = new Set([
  "api", "dashboard", "login", "cart", "checkout", "orders",
  "profile", "admin", "store", "stores", "account", "auth",
]);

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MIN_SLUG_LEN = 2;
export const MAX_SLUG_LEN = 64;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidSlugFormat(s: string): boolean {
  return s.length >= MIN_SLUG_LEN
    && s.length <= MAX_SLUG_LEN
    && SLUG_PATTERN.test(s);
}

export function isReservedSlug(s: string): boolean {
  return RESERVED_SLUGS.has(s);
}

export async function generateUniqueSlug(base: string, db: Db): Promise<string> {
  const validBase = base && isValidSlugFormat(base) && !isReservedSlug(base)
    ? base
    : "store";
  let candidate = validBase;
  let suffix = 1;
  const stores = db.collection<Store>("stores");
  while (await stores.findOne({ slug: candidate })) {
    suffix += 1;
    candidate = `${validBase}-${suffix}`;
  }
  return candidate;
}
