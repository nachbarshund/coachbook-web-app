import type { Metadata } from "next";
import { connection } from "next/server";
import { ExerciseScene } from "@/app/admin/upload/exercise-scene";
import { SavedNotice } from "./saved-notice";
import {
  EXERCISE_PHASES,
  EXERCISE_PHASE_LABELS,
  EXERCISE_TOPICS,
  EXERCISE_TOPIC_LABELS,
  parsePhase,
  parseTopic,
  type ExercisePhase,
  type ExerciseTopic,
} from "@/lib/exercise";
import { listExercises, type ExerciseListItem } from "@/lib/exercise-store";

export const metadata: Metadata = {
  title: "Übungen",
};

const SAVED_MESSAGES: Record<string, string> = {
  new: "Übung gespeichert.",
  edit: "Änderungen gespeichert.",
};

// The filter lives in the URL (?phase=…&topic=…), so it works without JavaScript and survives reloads.
function filterHref(phase: ExercisePhase | null, topic: ExerciseTopic | null): string {
  const params = new URLSearchParams();
  if (phase) params.set("phase", phase);
  if (topic) params.set("topic", topic);
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; phase?: string; topic?: string }>;
}) {
  // Rendered on request, never prerendered: the list comes from Blob.
  await connection();
  const { saved, phase: phaseParam, topic: topicParam } = await searchParams;
  const savedMessage = saved ? SAVED_MESSAGES[saved] : undefined;
  const phase = parsePhase(phaseParam);
  const topic = parseTopic(topicParam);

  let items: ExerciseListItem[] = [];
  let error: string | null = null;
  try {
    items = await listExercises();
  } catch {
    error = "Übungen konnten nicht geladen werden.";
  }

  const matchesPhase = (item: ExerciseListItem, value: ExercisePhase | null) => !value || item.exercise.phase === value;
  const matchesTopic = (item: ExerciseListItem, value: ExerciseTopic | null) => !value || item.exercise.topic === value;
  const visible = items.filter((item) => matchesPhase(item, phase) && matchesTopic(item, topic));

  // Counts respect the other axis, so a chip never promises more than it will show.
  const phaseCount = (value: ExercisePhase | null) =>
    items.filter((item) => matchesPhase(item, value) && matchesTopic(item, topic)).length;
  const topicCount = (value: ExerciseTopic | null) =>
    items.filter((item) => matchesPhase(item, phase) && matchesTopic(item, value)).length;
  const filtered = phase !== null || topic !== null;

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

      {items.length > 0 ? (
        <nav className="card filter-bar" aria-label="Übungen filtern">
          <div className="filter-bar__group">
            <span className="filter-bar__label">Phase</span>
            <div className="filter-bar__chips">
              <a
                href={filterHref(null, topic)}
                className={`chip-link${phase === null ? " chip-link--active" : ""}`}
                aria-current={phase === null ? "true" : undefined}
              >
                Alle <span className="chip-link__count">{phaseCount(null)}</span>
              </a>
              {EXERCISE_PHASES.map((value) => (
                <a
                  key={value}
                  href={filterHref(phase === value ? null : value, topic)}
                  className={`chip-link${phase === value ? " chip-link--active" : ""}`}
                  aria-current={phase === value ? "true" : undefined}
                >
                  {EXERCISE_PHASE_LABELS[value]} <span className="chip-link__count">{phaseCount(value)}</span>
                </a>
              ))}
            </div>
          </div>
          <div className="filter-bar__group">
            <span className="filter-bar__label">Thema</span>
            <div className="filter-bar__chips">
              <a
                href={filterHref(phase, null)}
                className={`chip-link${topic === null ? " chip-link--active" : ""}`}
                aria-current={topic === null ? "true" : undefined}
              >
                Alle <span className="chip-link__count">{topicCount(null)}</span>
              </a>
              {EXERCISE_TOPICS.map((value) => (
                <a
                  key={value}
                  href={filterHref(phase, topic === value ? null : value)}
                  className={`chip-link${topic === value ? " chip-link--active" : ""}`}
                  aria-current={topic === value ? "true" : undefined}
                >
                  {EXERCISE_TOPIC_LABELS[value]} <span className="chip-link__count">{topicCount(value)}</span>
                </a>
              ))}
            </div>
          </div>
          {filtered ? (
            <a href="/admin" className="filter-bar__reset">
              Filter zurücksetzen
            </a>
          ) : null}
        </nav>
      ) : null}

      {error ? (
        <section className="card empty" aria-live="polite">
          {error}
        </section>
      ) : items.length === 0 ? (
        <section className="card empty" aria-live="polite">
          Noch keine Übungen. Lege die erste aus einem Video, einer Idee oder einer Skizze an.
        </section>
      ) : visible.length === 0 ? (
        <section className="card empty" aria-live="polite">
          Keine Übung passt zu diesem Filter. <a href="/admin">Filter zurücksetzen</a>
        </section>
      ) : (
        <ul className="exercise-list">
          {visible.map((item) => (
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
