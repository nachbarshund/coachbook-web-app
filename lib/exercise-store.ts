import { get, list, put } from "@vercel/blob";
import type { Exercise } from "@/lib/exercise";

// Saved exercises live as private JSON blobs under this prefix.
const PREFIX = "exercises/";

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
  thumbnail: string | null;
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
              thumbnail: record.thumbnail ? `data:image/jpeg;base64,${record.thumbnail}` : null,
            },
          ]
        : [],
    )
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
