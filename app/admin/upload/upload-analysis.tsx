"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { extractFrames } from "@/lib/extract-frames";
import type { Exercise } from "@/lib/exercise";
import { ExerciseScene } from "./exercise-scene";

type Status = "empty" | "selected";
type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; percentage: number }
  | { phase: "stored"; pathname: string }
  | { phase: "error"; message: string };
type AnalysisState =
  | { phase: "idle" }
  | { phase: "running"; step: string }
  | { phase: "done"; exercise: Exercise }
  | { phase: "error"; message: string };

function safeFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}

export function UploadAnalysis() {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [tab, setTab] = useState<"scene" | "json">("scene");
  const [upstate, setUpstate] = useState<UploadState>({ phase: "idle" });
  const [analysis, setAnalysis] = useState<AnalysisState>({ phase: "idle" });

  const file = preview?.file ?? null;
  const previewUrl = preview?.url ?? null;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function selectFile(next: File | null) {
    setPreview(next ? { file: next, url: URL.createObjectURL(next) } : null);
    setUpstate({ phase: "idle" });
    setAnalysis({ phase: "idle" });
  }

  async function startUpload() {
    if (!file) return;
    setUpstate({ phase: "uploading", percentage: 0 });
    try {
      const pathname = `videos/${Date.now()}-${safeFileName(file.name)}`;
      const blob = await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/api/blob",
        contentType: file.type || "video/mp4",
        onUploadProgress: ({ percentage }) => {
          setUpstate({ phase: "uploading", percentage: Math.round(percentage) });
        },
      });
      setUpstate({ phase: "stored", pathname: blob.pathname });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload fehlgeschlagen.";
      setUpstate({ phase: "error", message });
    }
  }

  async function startAnalysis() {
    if (!file) return;
    setAnalysis({ phase: "running", step: "Frames werden aus dem Video gezogen…" });
    try {
      const frames = await extractFrames(file);
      setAnalysis({ phase: "running", step: "Analyse läuft, das dauert etwa 20 bis 40 Sekunden…" });
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames }),
      });
      const data = (await response.json().catch(() => null)) as
        | { exercise?: Exercise; error?: string }
        | null;
      if (!response.ok || !data?.exercise) {
        throw new Error(data?.error ?? "Analyse fehlgeschlagen.");
      }
      setAnalysis({ phase: "done", exercise: data.exercise });
      setTab("scene");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analyse fehlgeschlagen.";
      setAnalysis({ phase: "error", message });
    }
  }

  const status: Status = file ? "selected" : "empty";
  const sizeMb = file ? (file.size / 1024 / 1024).toFixed(1) : null;
  const busy = upstate.phase === "uploading" || analysis.phase === "running";

  let statusText = "Warte auf Video";
  if (file) statusText = "Video bereit";
  if (upstate.phase === "uploading") statusText = `Upload läuft… ${upstate.percentage} %`;
  if (upstate.phase === "stored") statusText = "Video gespeichert";
  if (upstate.phase === "error") statusText = `Upload-Fehler: ${upstate.message}`;
  if (analysis.phase === "running") statusText = analysis.step;
  if (analysis.phase === "error") statusText = `Analyse-Fehler: ${analysis.message}`;

  return (
    <div className="analysis">
      <section className="analysis__media">
        <label className="dropzone">
          <span>Video auswählen, MP4 oder MOV.</span>
          <input
            type="file"
            accept="video/*"
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <div className="video-frame">
          {previewUrl ? (
            <video src={previewUrl} controls playsInline preload="metadata" />
          ) : (
            <div className="video-frame__hint">Noch kein Video ausgewählt</div>
          )}
        </div>

        {file ? (
          <div className="tag-row">
            <span className="chip chip--pitch">{file.name}</span>
            <span className="chip">{sizeMb} MB</span>
          </div>
        ) : null}
      </section>

      <section className="analysis__result">
        <div className="card result-panel">
          <div className="result-panel__tabs" role="tablist" aria-label="Ansicht">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "scene"}
              className={tab === "scene" ? "pill pill--solid" : "pill pill--ghost"}
              onClick={() => setTab("scene")}
            >
              Szene
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "json"}
              className={tab === "json" ? "pill pill--solid" : "pill pill--ghost"}
              onClick={() => setTab("json")}
            >
              JSON
            </button>
          </div>

          <div className="scene-placeholder" role="tabpanel">
            {analysis.phase === "done" ? (
              tab === "scene" ? (
                <ExerciseScene exercise={analysis.exercise} />
              ) : (
                <pre className="exercise-json">{JSON.stringify(analysis.exercise, null, 2)}</pre>
              )
            ) : tab === "scene" ? (
              status === "empty"
                ? "Nach dem Analysieren erscheint hier die Feldskizze aus dem Video."
                : "Noch keine Analyse. Mit „Analysieren“ startest Du die Auswertung."
            ) : (
              "Das JSON im Schema coachbook.exercise/v1 erscheint hier nach der Analyse."
            )}
          </div>

          <div className="result-panel__status">{statusText}</div>
        </div>

        <div className="card result-panel">
          <div className="section-title">Ablauf</div>
          <ol className="steps-list">
            <li>Video hochladen und Vorschau prüfen</li>
            <li>Frames werden im Browser aus dem Video gezogen</li>
            <li>Ergebnis prüfen, Hütchen korrigieren, übernehmen</li>
          </ol>
        </div>

        <div className="admin__actions">
          <button type="button" className="pill pill--ghost" disabled={!file || busy} onClick={() => selectFile(null)}>
            Verwerfen
          </button>
          <button
            type="button"
            className="pill pill--ghost"
            disabled={!file || busy || upstate.phase === "stored"}
            onClick={startUpload}
          >
            Hochladen
          </button>
          <button type="button" className="pill pill--ghost" disabled={!file || busy} onClick={startAnalysis}>
            Analysieren
          </button>
          <button type="button" className="pill pill--solid" disabled>
            Übernehmen
          </button>
        </div>
      </section>
    </div>
  );
}
