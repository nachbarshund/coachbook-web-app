import { get, list, put } from "@vercel/blob";
import type { Exercise, ExercisePhase, ExerciseTopic } from "@/lib/exercise";

// Saved exercises live as private JSON blobs under this prefix.
const PREFIX = "exercises/";
const ID_PATTERN = /^[a-z0-9-]+$/;

// Thumbnail is a base64 JPEG (no data-URL prefix).
export type SavedExercise = { id: string; savedAt: string; exercise: Exercise; thumbnail: string | null };

export type ExerciseListItem = {
  id: string;
  title: string;
  savedAt: string;
  playerCount: number | null;
  stepCount: number;
  category: string | null;
  ageGroup: string | null;
  preview: string[];
  exercise: Exercise;
};

export type ExercisePatch = {
  title: string;
  category: string | null;
  phase: ExercisePhase | null;
  topic: ExerciseTopic | null;
  ageGroup: string | null;
  durationMinutes: number | null;
  steps: string[];
  coachingPoints: string[];
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "uebung"
  );
}

export async function saveExercise(exercise: Exercise, thumbnail: string | null): Promise<SavedExercise> {
  const savedAt = new Date().toISOString();
  const id = `${Date.now()}-${slugify(exercise.title)}`;
  const record: SavedExercise = { id, savedAt, exercise, thumbnail };
  await put(`${PREFIX}${id}.json`, JSON.stringify(record), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return record;
}

export async function getExercise(id: string): Promise<SavedExercise | null> {
  if (!ID_PATTERN.test(id)) return null;
  try {
    const result = await get(`${PREFIX}${id}.json`, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return (await new Response(result.stream).json()) as SavedExercise;
  } catch {
    return null;
  }
}

export async function updateExercise(id: string, patch: ExercisePatch): Promise<SavedExercise | null> {
  const current = await getExercise(id);
  if (!current) return null;
  const next: SavedExercise = { ...current, exercise: { ...current.exercise, ...patch } };
  await put(`${PREFIX}${id}.json`, JSON.stringify(next), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return next;
}

// The sketch GIF lives outside `exercises/`, so listing the JSON records never sees it.
const GIF_PREFIX = "media/";

export async function saveExerciseGif(id: string, data: ArrayBuffer): Promise<void> {
  await put(`${GIF_PREFIX}${id}.gif`, Buffer.from(data), {
    access: "private",
    contentType: "image/gif",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function getExerciseGif(id: string): Promise<ReadableStream | null> {
  if (!ID_PATTERN.test(id)) return null;
  try {
    const result = await get(`${GIF_PREFIX}${id}.gif`, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return result.stream;
  } catch {
    return null;
  }
}

export async function listExercises(): Promise<ExerciseListItem[]> {
  const { blobs } = await list({ prefix: PREFIX });
  const records = await Promise.all(
    blobs.map(async (blob) => {
      const result = await get(blob.pathname, { access: "private", useCache: false });
      if (!result || result.statusCode !== 200) return null;
      return (await new Response(result.stream).json()) as SavedExercise;
    }),
  );

  return records
    .flatMap((record) =>
      record
        ? [
            {
              id: record.id,
              title: record.exercise.title,
              savedAt: record.savedAt,
              playerCount: record.exercise.playerCount,
              stepCount: record.exercise.steps.length,
              category: record.exercise.category,
              ageGroup: record.exercise.ageGroup,
              preview: record.exercise.steps.slice(0, 2),
              exercise: record.exercise,
            },
          ]
        : [],
    )
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
