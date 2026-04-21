import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { cloudinary } from "@/lib/cloudinary-client";

export const runtime = "nodejs";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const KINDS = new Set(["avatar", "logo", "banner", "product"]);

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const kind = form.get("kind");
  if (typeof kind !== "string" || !KINDS.has(kind)) {
    return NextResponse.json({ error: "INVALID_KIND" }, { status: 400 });
  }
  if (kind !== "avatar" && session.role !== "seller") {
    return NextResponse.json({ error: "FORBIDDEN", message: "sellers only" }, { status: 403 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE", message: "max 8 MB" }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "UNSUPPORTED_TYPE", message: "JPEG, PNG, or WebP only" }, { status: 415 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<{ secure_url: string; public_id: string } | { error: string }>((resolve) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `chalksniffer/${kind}`,
        resource_type: "image",
      },
      (err, res) => {
        if (err || !res) resolve({ error: err?.message ?? "upload failed" });
        else resolve({ secure_url: res.secure_url, public_id: res.public_id });
      }
    );
    stream.end(bytes);
  });

  if ("error" in result) {
    return NextResponse.json({ error: "UPSTREAM_FAILED", message: result.error }, { status: 502 });
  }

  return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
}
