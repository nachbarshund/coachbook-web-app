import { NextResponse } from "next/server";
import { hasApiAccess, hasWriteAccess } from "@/lib/api-auth";
import { parseDuration, parsePhase, parseTopic } from "@/lib/exercise";
import { getExercise, updateExercise, type ExercisePatch } from "@/lib/exercise-store";

export const dynamic = "force-dynamic";

// Read-only single exercise for the app (Bearer token). Includes the thumbnail
// (base64 JPEG without data-URL prefix, or null); the list endpoint leaves it out.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasApiAccess(request)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { id } = await params;
  const record = await getExercise(id);
  if (!record) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({
    id: record.id,
    savedAt: record.savedAt,
    exercise: record.exercise,
    thumbnail: record.thumbnail ?? null,
  });
}

const MAX_TEXT = 300;
const MAX_LIST = 30;

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function textList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.flatMap((item) => (text(item, MAX_TEXT) ? [text(item, MAX_TEXT) as string] : [])).slice(0, MAX_LIST);
}

// Updates the editable fields of a saved exercise (admin session or app token).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasWriteAccess(request))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const title = text(body?.title, 120);
  const steps = textList(body?.steps);
  const coachingPoints = textList(body?.coachingPoints);
  if (!title || !steps || !coachingPoints) {
    return NextResponse.json({ error: "Ungültige Eingaben." }, { status: 400 });
  }

  const patch: ExercisePatch = {
    title,
    category: text(body?.category, 80),
    phase: parsePhase(body?.phase),
    topic: parseTopic(body?.topic),
    ageGroup: text(body?.ageGroup, 40),
    durationMinutes: parseDuration(body?.durationMinutes),
    steps,
    coachingPoints,
  };

  try {
    const updated = await updateExercise(id, patch);
    if (!updated) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 502 });
  }
}
