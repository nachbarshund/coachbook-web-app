import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { hasWriteAccess } from "@/lib/api-auth";

// Client uploads go straight to Vercel Blob; this route only issues
// short-lived upload tokens to an authenticated admin.
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  // Checked once per request; the upload-completed callback from Vercel carries no credentials and never reaches the callback below.
  const allowed = await hasWriteAccess(request);

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!allowed) {
          throw new Error("Not authorized");
        }
        if (!pathname.startsWith("videos/")) {
          throw new Error("Invalid upload path");
        }
        return {
          allowedContentTypes: ALLOWED_VIDEO_TYPES,
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
