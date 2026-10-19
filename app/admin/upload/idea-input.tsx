"use client";

import { useEffect, useState } from "react";
import { renderExerciseGif } from "@/lib/exercise-gif";
import { resizeImage, type ResizedImage } from "@/lib/resize-image";
import type { Exercise } from "@/lib/exercise";
import { ExerciseScene } from "./exercise-scene";

type GenerateState =
  | { phase: "idle" }
  | { phase: "running"; startedAt: number }
  | { phase: "done"; exercise: Exercise }
  | { phase: "error"; message: string };

const EXPECTED_MS = 40_000;

function Progress({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = Math.max(0, now - startedAt);
  const percent = Math.min(95, (elapsed / EXPECTED_MS) * 95);
  const overdue = elapsed > EXPECTED_MS;

  return (
    <div className="analysis-progress">
      <span className="spinner" aria-hidden="true" />
      <p className="analysis-progress__title">Übung wird erzeugt…</p>
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="progress-meta">
        {overdue ? "Dauert etwas länger als üblich, bitte kurz warten." : "Dauert meist 15 bis 40 Sekunden."}
      </p>
    </div>
  );
}

export function IdeaInput() {
  const [idea, setIdea] = useState("");
  const [image, setImage] = useState<ResizedImage | null>(null);
  const [imageError, setImageError] = useState("");
  const [state, setState] = useState<GenerateState>({ phase: "idle" });
  const [resultTab, setResultTab] = useState<"scene" | "json">("scene");
  const [title, setTitle] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const running = state.phase === "running";
  const hasInput = idea.trim().length > 0 || image !== null;

  async function chooseImage(file: File) {
    setImageError("");
    try {
      setImage(await resizeImage(file));
    } catch (error) {
      setImage(null);
      setImageError(error instanceof Error ? error.message : "Das Bild konnte nicht gelesen werden.");
    }
  }

  // First run sends only idea and image; a revision also sends the current result and the correction.
  async function generate(revision?: { previous: Exercise; feedback: string }) {
    setState({ phase: "running", startedAt: Date.now() });
    setSaveState("idle");
    try {
      const response = await fetch("/api/ideate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          image: image ? { data: image.data, mediaType: image.mediaType } : undefined,
          previous: revision?.previous,
          feedback: revision?.feedback,
        }),
      });
      const data = (await response.json().catch(() => null)) as { exercise?: Exercise; error?: string } | null;
      if (!response.ok || !data?.exercise) throw new Error(data?.error ?? "Erzeugen fehlgeschlagen.");
      setState({ phase: "done", exercise: data.exercise });
      setTitle(data.exercise.title);
      setResultTab("scene");
      setFeedback("");
    } catch (error) {
      setState({ phase: "error", message: error instanceof Error ? error.message : "Erzeugen fehlgeschlagen." });
    }
  }

  async function save(exercise: Exercise) {
    setSaveState("saving");
    const finished = { ...exercise, title: title.trim() || exercise.title };
    try {
      const response = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise: finished, thumbnail: null }),
      });
      const data = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!response.ok || !data?.id) throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
      // Same as after a video: the sketch GIF is for the app import and must not undo the saved exercise.
      try {
        const gif = await renderExerciseGif(finished);
        await fetch(`/api/exercises/${data.id}/gif`, { method: "PUT", headers: { "Content-Type": "image/gif" }, body: gif });
      } catch {}
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function reset() {
    if (running) return;
    setIdea("");
    setImage(null);
    setImageError("");
    setState({ phase: "idle" });
    setFeedback("");
    setSaveState("idle");
  }

  const exercise = state.phase === "done" ? state.exercise : null;

  return (
    <div className="analysis">
      <section className="analysis__media">
        <div className="card result-panel">
          <label className="form-field">
            <span>Idee</span>
            <textarea
              rows={8}
              value={idea}
              disabled={running}
              maxLength={3000}
              placeholder="z. B. Abschlussspiel 11 gegen 11 auf ganzem Feld, zwei Tore, Gelb gegen Rot, 20 Minuten"
              onChange={(event) => setIdea(event.target.value)}
            />
          </label>

          {image ? (
            <figure className="editor__gif">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.previewUrl} alt="Hochgeladene Skizze oder Foto" />
              <figcaption>Skizze oder Foto, wird mit der Idee ausgewertet</figcaption>
            </figure>
          ) : (
            <label className="dropzone">
              <span>Optional: Foto oder Handskizze auswählen.</span>
              <input
                type="file"
                accept="image/*"
                disabled={running}
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  if (next) void chooseImage(next);
                }}
              />
            </label>
          )}
          {imageError ? <p className="result-panel__text result-panel__text--error">{imageError}</p> : null}

          <div className="admin__actions">
            {image ? (
              <button type="button" className="pill pill--ghost" disabled={running} onClick={() => setImage(null)}>
                Bild entfernen
              </button>
            ) : null}
            <button type="button" className="pill pill--ghost" disabled={running} onClick={reset}>
              Neu beginnen
            </button>
            <button
              type="button"
              className="pill pill--solid"
              disabled={running || !hasInput}
              onClick={() => void generate()}
            >
              {running ? "Erzeugt…" : exercise ? "Neu erzeugen" : "Übung erzeugen"}
            </button>
          </div>
        </div>
      </section>

      <section className="analysis__result">
        <div className="card result-panel">
          <label className="title-field">
            <span>Titel der Übung</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!exercise}
              placeholder="Wird aus der Idee vorgeschlagen"
            />
          </label>

          <div className="result-panel__tabs" role="tablist" aria-label="Ansicht">
            <button
              type="button"
              role="tab"
              aria-selected={resultTab === "scene"}
              className={resultTab === "scene" ? "pill pill--solid" : "pill pill--ghost"}
              onClick={() => setResultTab("scene")}
            >
              Szene
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={resultTab === "json"}
              className={resultTab === "json" ? "pill pill--solid" : "pill pill--ghost"}
              onClick={() => setResultTab("json")}
            >
              JSON
            </button>
          </div>

          <div className="scene-placeholder" role="tabpanel">
            {state.phase === "running" ? (
              <Progress startedAt={state.startedAt} />
            ) : state.phase === "error" ? (
              <p className="result-panel__text result-panel__text--error">Erzeugen fehlgeschlagen: {state.message}</p>
            ) : exercise ? (
              resultTab === "scene" ? (
                <ExerciseScene exercise={exercise} />
              ) : (
                <pre className="exercise-json">{JSON.stringify(exercise, null, 2)}</pre>
              )
            ) : (
              <p className="result-panel__text">Idee beschreiben oder Skizze hochladen, dann Übung erzeugen.</p>
            )}
          </div>

          {exercise ? (
            <>
              <label className="form-field">
                <span>Korrektur, z. B. „Tore an die Seiten, ein Spieler mehr bei Gelb“</span>
                <textarea
                  rows={3}
                  value={feedback}
                  disabled={running}
                  maxLength={3000}
                  onChange={(event) => setFeedback(event.target.value)}
                />
              </label>
              <div className="admin__actions">
                <button
                  type="button"
                  className="pill pill--ghost"
                  disabled={running || !feedback.trim()}
                  onClick={() => void generate({ previous: { ...exercise, title: title.trim() || exercise.title }, feedback })}
                >
                  Nachbessern
                </button>
                <button
                  type="button"
                  className="pill pill--solid"
                  disabled={running || saveState === "saving" || saveState === "saved"}
                  onClick={() => void save(exercise)}
                >
                  {saveState === "saved"
                    ? "Gespeichert"
                    : saveState === "saving"
                      ? "Speichert…"
                      : saveState === "error"
                        ? "Erneut speichern"
                        : "Übernehmen"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
