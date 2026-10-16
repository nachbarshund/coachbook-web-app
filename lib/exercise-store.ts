import { get, list, put } from "@vercel/blob";
import type { Exercise } from "@/lib/exercise";

// Saved exercises live as private JSON blobs under this prefix.
const PREFIX = "exercises/";

export type SavedExercise = { id: string; savedAt: string; exercise: Exercise };

export type ExerciseListItem = {
  id: string;
  title: string;
  savedAt: string;
  playerCount: number | null;
  stepCount: number;
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "uebung"
  );
}

export async function saveExercise(exercise: Exercise): Promise<SavedExercise> {
  const savedAt = new Date().toISOString();
  const id = `${Date.now()}-${slugify(exercise.title)}`;
  const record: SavedExercise = { id, savedAt, exercise };
  await put(`${PREFIX}${id}.json`, JSON.stringify(record), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return record;
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
            },
          ]
        : [],
    )
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
