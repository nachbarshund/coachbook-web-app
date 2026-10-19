"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EXERCISE_PHASES,
  EXERCISE_PHASE_LABELS,
  EXERCISE_TOPICS,
  EXERCISE_TOPIC_LABELS,
  parsePhase,
  parseTopic,
  type Exercise,
  type ExercisePhase,
  type ExerciseTopic,
} from "@/lib/exercise";
import { ExerciseScene } from "@/app/admin/upload/exercise-scene";
import { renderExerciseGif } from "@/lib/exercise-gif";

const fromLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function ExerciseEditor({ id, exercise }: { id: string; exercise: Exercise }) {
  const router = useRouter();
  const [title, setTitle] = useState(exercise.title);
  const [category, setCategory] = useState(exercise.category ?? "");
  const [phase, setPhase] = useState<ExercisePhase | null>(exercise.phase ?? null);
  const [topic, setTopic] = useState<ExerciseTopic | null>(exercise.topic ?? null);
  const [ageGroup, setAgeGroup] = useState(exercise.ageGroup ?? "");
  const [steps, setSteps] = useState(exercise.steps.join("\n"));
  const [coaching, setCoaching] = useState(exercise.coachingPoints.join("\n"));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [gifStatus, setGifStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [gifError, setGifError] = useState("");
  // Bumped after each render so the preview reloads; hidden while the server has no GIF (404).
  const [gifVersion, setGifVersion] = useState(0);
  const [gifVisible, setGifVisible] = useState(true);

  // Renders the sketch as a GIF in the browser and stores it for the app import.
  async function makeGif() {
    setGifStatus("working");
    setGifError("");
    try {
      const blob = await renderExerciseGif(exercise);
      const response = await fetch(`/api/exercises/${id}/gif`, {
        method: "PUT",
        headers: { "Content-Type": "image/gif" },
        body: blob,
      });
      if (!response.ok) throw new Error("Hochladen fehlgeschlagen.");
      setGifVersion((v) => v + 1);
      setGifVisible(true);
      setGifStatus("done");
    } catch (error) {
      setGifError(error instanceof Error ? error.message : "GIF fehlgeschlagen.");
      setGifStatus("error");
    }
  }

  async function save() {
    setStatus("saving");
    try {
      const response = await fetch(`/api/exercises/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim() || null,
          phase,
          topic,
          ageGroup: ageGroup.trim() || null,
          steps: fromLines(steps),
          coachingPoints: fromLines(coaching),
        }),
      });
      setStatus(response.ok ? "saved" : "error");
      if (response.ok) router.push("/admin?saved=edit");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="editor">
      <section className="card editor__preview">
        <ExerciseScene exercise={exercise} showDetails={false} />
        {gifVisible ? (
          <figure className="editor__gif">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/exercises/${id}/media?v=${gifVersion}`}
              alt={`GIF: ${exercise.title}`}
              onError={() => setGifVisible(false)}
            />
            <figcaption>GIF (so kommt es in die App)</figcaption>
          </figure>
        ) : null}
      </section>

      <section className="card editor__form">
        <label className="form-field">
          <span>Titel</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <div className="editor__row">
          <label className="form-field">
            <span>Phase</span>
            <select value={phase ?? ""} onChange={(event) => setPhase(parsePhase(event.target.value))}>
              <option value="">Nicht festgelegt</option>
              {EXERCISE_PHASES.map((value) => (
                <option key={value} value={value}>
                  {EXERCISE_PHASE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Thema</span>
            <select value={topic ?? ""} onChange={(event) => setTopic(parseTopic(event.target.value))}>
              <option value="">Nicht festgelegt</option>
              {EXERCISE_TOPICS.map((value) => (
                <option key={value} value={value}>
                  {EXERCISE_TOPIC_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="editor__row">
          <label className="form-field">
            <span>Kategorie</span>
            <input value={category} onChange={(event) => setCategory(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Altersklasse</span>
            <input value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)} />
          </label>
        </div>

        <label className="form-field">
          <span>Ablauf (ein Schritt pro Zeile)</span>
          <textarea rows={6} value={steps} onChange={(event) => setSteps(event.target.value)} />
        </label>

        <label className="form-field">
          <span>Coaching-Punkte (eine pro Zeile)</span>
          <textarea rows={4} value={coaching} onChange={(event) => setCoaching(event.target.value)} />
        </label>

        <div className="admin__actions">
          <button
            type="button"
            className="pill pill--solid"
            disabled={!title.trim() || status === "saving"}
            onClick={save}
          >
            {status === "saving" ? "Speichert…" : "Speichern"}
          </button>
          {status === "saved" ? <span className="editor__status">Gespeichert</span> : null}
          <button type="button" className="pill pill--ghost" disabled={gifStatus === "working"} onClick={makeGif}>
            {gifStatus === "working" ? "GIF wird erzeugt…" : "GIF erzeugen"}
          </button>
          {gifStatus === "done" ? <span className="editor__status">GIF gespeichert</span> : null}
          {gifStatus === "error" ? <span className="editor__status editor__status--error">{gifError}</span> : null}
          {status === "error" ? <span className="editor__status editor__status--error">Speichern fehlgeschlagen</span> : null}
        </div>
      </section>
    </div>
  );
}
