import { NextResponse } from "next/server";
import { hasApiAccess } from "@/lib/api-auth";
import { getExerciseGif } from "@/lib/exercise-store";

export const dynamic = "force-dynamic";

// Sketch GIF for the app (Bearer token). 404 if none was rendered yet.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasApiAccess(request)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { id } = await params;
  const stream = await getExerciseGif(id);
  if (!stream) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  return new Response(stream, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
}
