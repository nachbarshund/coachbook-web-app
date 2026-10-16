import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getExercise } from "@/lib/exercise-store";
import { ExerciseEditor } from "./exercise-editor";

export const metadata: Metadata = {
  title: "Übung bearbeiten",
};

export default async function EditExercisePage({ params }: { params: Promise<{ id: string }> }) {
  // Rendered on request, never prerendered.
  await connection();
  const { id } = await params;
  const record = await getExercise(id);
  if (!record) notFound();

  return (
    <>
      <header className="admin__head">
        <div>
          <div className="eyebrow">Übung bearbeiten</div>
          <div className="admin__title">{record.exercise.title}</div>
        </div>
        <Link href="/admin" className="pill pill--ghost">
          Zurück
        </Link>
      </header>

      <ExerciseEditor id={record.id} exercise={record.exercise} />
    </>
  );
}
