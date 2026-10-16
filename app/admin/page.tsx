import type { Metadata } from "next";
import { connection } from "next/server";
import { listExercises, type ExerciseListItem } from "@/lib/exercise-store";

export const metadata: Metadata = {
  title: "Übungen",
};

export default async function ExercisesPage() {
  // Rendered on request, never prerendered: the list comes from Blob.
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
        <a href="/admin/upload" className="pill pill--solid">
          Video hochladen
        </a>
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
        <ul className="exercise-list">
          {items.map((item) => (
            <li key={item.id}>
              <a href={`/admin/exercises/${item.id}`} className="card exercise-row">
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="exercise-row__thumb" src={item.thumbnail} alt="" />
                ) : (
                  <div className="exercise-row__thumb exercise-row__thumb--empty" aria-hidden="true" />
                )}
                <div className="exercise-row__body">
                  <div className="exercise-row__meta">
                    {[item.category, item.ageGroup].filter(Boolean).join(" · ") || "Übung"}
                  </div>
                  <h2>{item.title}</h2>
                  {item.preview.length ? <p className="exercise-row__preview">{item.preview.join(" · ")}</p> : null}
                  <div className="tag-row">
                    <span className="chip">{new Date(item.savedAt).toLocaleDateString("de-DE")}</span>
                    {item.playerCount ? <span className="chip">{item.playerCount} Spieler</span> : null}
                    <span className="chip">{item.stepCount} Schritte</span>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
