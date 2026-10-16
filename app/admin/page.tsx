import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { listExercises, type ExerciseListItem } from "@/lib/exercise-store";

export const metadata: Metadata = {
  title: "Übungen",
};

// Reads the saved exercises on every request.
export const instant = false;

export default async function ExercisesPage() {
  // Marks the page as request-time so the Blob listing is not prerendered at build.
  await connection();

  let items: ExerciseListItem[] = [];
  let error: string | null = null;
  try {
    items = await listExercises();
  } catch {
    error = "Übungen konnten nicht geladen werden.";
  }

  return (
    <>
      <header className="admin__head">
        <div>
          <div className="eyebrow">Katalog</div>
          <div className="admin__title">Übungen</div>
        </div>
        <Link href="/admin/upload" className="pill pill--solid">
          Video hochladen
        </Link>
      </header>

      {error ? (
        <section className="card empty" aria-live="polite">
          {error}
        </section>
      ) : items.length === 0 ? (
        <section className="card empty" aria-live="polite">
          Noch keine Übungen. Lade ein Video hoch, um die erste Übung anzulegen.
        </section>
      ) : (
        <section className="exercise-list">
          {items.map((item) => (
            <article key={item.id} className="card exercise-card">
              <h2>{item.title}</h2>
              <p>
                {new Date(item.savedAt).toLocaleDateString("de-DE")} · {item.playerCount ?? "?"} Spieler · {item.stepCount}{" "}
                Schritte
              </p>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
