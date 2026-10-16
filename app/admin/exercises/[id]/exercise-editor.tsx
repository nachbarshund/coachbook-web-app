"use client";

import { useState } from "react";
import type { Exercise } from "@/lib/exercise";
import { ExerciseScene } from "@/app/admin/upload/exercise-scene";
import { renderExerciseGif } from "@/lib/exercise-gif";

const fromLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function ExerciseEditor({ id, exercise }: { id: string; exercise: Exercise }) {
  const [title, setTitle] = useState(exercise.title);
  const [category, setCategory] = useState(exercise.category ?? "");
  const [ageGroup, setAgeGroup] = useState(exercise.ageGroup ?? "");
  const [steps, setSteps] = useState(exercise.steps.join("\n"));
  const [coaching, setCoaching] = useState(exercise.coachingPoints.join("\n"));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [gifStatus, setGifStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [gifError, setGifError] = useState("");

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
          ageGroup: ageGroup.trim() || null,
          steps: fromLines(steps),
          coachingPoints: fromLines(coaching),
        }),
      });
      setStatus(response.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="editor">
      <section className="card editor__preview">
        <ExerciseScene exercise={exercise} showDetails={false} />
      </section>

      <section className="card editor__form">
        <label className="form-field">
          <span>Titel</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

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
