import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth";
import { EXERCISE_SCHEMA_ID, type Exercise } from "@/lib/exercise";
import { saveExercise } from "@/lib/exercise-store";

const MAX_THUMBNAIL_CHARS = 400_000;

// Saves an analysed exercise with its thumbnail (admin only).
export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
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

  try {
    const saved = await saveExercise(exercise, thumbnail);
    return NextResponse.json({ id: saved.id });
  } catch (error) {
    console.error("Save failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 502 });
  }
}
