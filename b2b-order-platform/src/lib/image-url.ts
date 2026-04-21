export type ImageKind = "logo" | "banner" | "avatar" | "product";

const RULES: Record<ImageKind, string> = {
  logo: "c_fill,g_auto,w_400,h_400",
  avatar: "c_fill,g_auto,w_200,h_200",
  banner: "c_fill,g_auto,w_1600,h_500",
  product: "c_fill,g_auto,w_800,h_800",
};

/**
 * If `url` is a Cloudinary secure URL (contains `/upload/`), inject the kind's
 * transform rules so the CDN delivers a cropped/sized image. Non-Cloudinary
 * URLs (e.g., the Unsplash seed URLs) pass through unchanged.
 */
export function transformedImageUrl(url: string | undefined | null, kind: ImageKind): string {
  if (!url) return "";
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/${RULES[kind]}/`);
}
