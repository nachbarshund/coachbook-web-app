import { NextResponse } from "next/server";
import { hasApiAccess, hasWriteAccess } from "@/lib/api-auth";
import { EXERCISE_SCHEMA_ID, parsePhase, parseTopic, type Exercise } from "@/lib/exercise";
import { listExercises, saveExercise } from "@/lib/exercise-store";

export const dynamic = "force-dynamic";

const MAX_THUMBNAIL_CHARS = 400_000;

// Read-only list for the app (Bearer token). Thumbnails are left out to keep it small.
export async function GET(request: Request) {
  if (!hasApiAccess(request)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  try {
    const items = await listExercises();
    return NextResponse.json({
      exercises: items.map((item) => ({ id: item.id, savedAt: item.savedAt, exercise: item.exercise })),
    });
  } catch (error) {
    console.error("List failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Laden fehlgeschlagen." }, { status: 502 });
  }
}

// Saves an analysed exercise with its thumbnail (admin session or app token).
export async function POST(request: Request) {
  if (!(await hasWriteAccess(request))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { exercise?: Exercise; thumbnail?: unknown }
    | null;
  const exercise = body?.exercise;
  if (!exercise || exercise.schema !== EXERCISE_SCHEMA_ID || typeof exercise.title !== "string") {
    return NextResponse.json({ error: "Ungültige Übung." }, { status: 400 });
  }
  const thumbnail =
    typeof body?.thumbnail === "string" && body.thumbnail.length <= MAX_THUMBNAIL_CHARS ? body.thumbnail : null;

  // Keep only known classification values, whatever the client sent.
  const clean: Exercise = { ...exercise, phase: parsePhase(exercise.phase), topic: parseTopic(exercise.topic) };

  try {
    const saved = await saveExercise(clean, thumbnail);
    return NextResponse.json({ id: saved.id });
  } catch (error) {
    console.error("Save failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 502 });
  }
}
