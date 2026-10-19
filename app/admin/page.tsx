import type { Metadata } from "next";
import { connection } from "next/server";
import { ExerciseScene } from "@/app/admin/upload/exercise-scene";
import { SavedNotice } from "./saved-notice";
import { EXERCISE_PHASE_LABELS, EXERCISE_TOPIC_LABELS } from "@/lib/exercise";
import { listExercises, type ExerciseListItem } from "@/lib/exercise-store";

export const metadata: Metadata = {
  title: "Übungen",
};

const SAVED_MESSAGES: Record<string, string> = {
  new: "Übung gespeichert.",
  edit: "Änderungen gespeichert.",
};

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  // Rendered on request, never prerendered: the list comes from Blob.
  await connection();
  const { saved } = await searchParams;
  const savedMessage = saved ? SAVED_MESSAGES[saved] : undefined;

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
          Übung hinzufügen
        </a>
      </header>

      {savedMessage ? <SavedNotice message={savedMessage} /> : null}

      {error ? (
        <section className="card empty" aria-live="polite">
          {error}
        </section>
      ) : items.length === 0 ? (
        <section className="card empty" aria-live="polite">
          Noch keine Übungen. Lege die erste aus einem Video, einer Idee oder einer Skizze an.
        </section>
      ) : (
        <ul className="exercise-list">
          {items.map((item) => (
            <li key={item.id}>
              <a href={`/admin/exercises/${item.id}`} className="card exercise-row">
                <div className="exercise-row__pitch">
                  <ExerciseScene exercise={item.exercise} compact />
                </div>
                <div className="exercise-row__body">
                  <div className="exercise-row__meta">
                    {[item.category, item.ageGroup].filter(Boolean).join(" · ") || "Übung"}
                  </div>
                  <h2>{item.title}</h2>
                  {item.preview.length ? <p className="exercise-row__preview">{item.preview.join(" · ")}</p> : null}
                  <div className="tag-row">
                    {item.exercise.phase ? (
                      <span className="chip chip--pitch">{EXERCISE_PHASE_LABELS[item.exercise.phase]}</span>
                    ) : null}
                    {item.exercise.topic ? (
                      <span className="chip chip--pitch">{EXERCISE_TOPIC_LABELS[item.exercise.topic]}</span>
                    ) : null}
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

      {items.length > 0 ? (
        <div className="exercise-list__foot">
          <a href="/admin/upload" className="pill pill--solid">
            Übung hinzufügen
          </a>
        </div>
      ) : null}
    </>
  );
}
