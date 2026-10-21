import { NextResponse } from "next/server";
import { hasWriteAccess } from "@/lib/api-auth";
import { getExercise, saveExerciseGif } from "@/lib/exercise-store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4_000_000;

// Stores the sketch GIF that the browser rendered for an exercise (admin session or app token).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasWriteAccess(request))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await getExercise(id))) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const data = await request.arrayBuffer();
  const header = new TextDecoder().decode(data.slice(0, 6));
  if (data.byteLength === 0 || data.byteLength > MAX_BYTES || !header.startsWith("GIF8")) {
    return NextResponse.json({ error: "Ungültiges GIF." }, { status: 400 });
  }

  try {
    await saveExerciseGif(id, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("GIF save failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 502 });
  }
}
