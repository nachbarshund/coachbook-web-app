"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { extractFrames } from "@/lib/extract-frames";
import type { Exercise } from "@/lib/exercise";
import { ExerciseScene } from "./exercise-scene";

const FRAME_COUNT = 8;
// Typical duration of the AI step; used only for the estimate shown to the user.
const AI_EXPECTED_MS = 35_000;

type Step = 1 | 2 | 3;
type UploadState =
  | { phase: "idle" }
  | { phase: "running"; percentage: number }
  | { phase: "done"; pathname: string }
  | { phase: "error"; message: string };
type AnalysisState =
  | { phase: "idle" }
  | { phase: "frames"; framesDone: number }
  | { phase: "ai"; startedAt: number }
  | { phase: "done"; exercise: Exercise }
  | { phase: "error"; message: string };

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Video" },
  { n: 2, label: "Upload" },
  { n: 3, label: "Analyse" },
];

function safeFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}

function AnalysisProgress({ state }: { state: Extract<AnalysisState, { phase: "frames" | "ai" }> }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  if (state.phase === "frames") {
    const percent = (state.framesDone / FRAME_COUNT) * 20;
    return (
      <>
        <div className="progress-row">
          <span className="spinner" aria-hidden="true" />
          <span>Frames werden aus dem Video gezogen ({state.framesDone}/{FRAME_COUNT})</span>
        </div>
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="progress-meta">Dauert nur wenige Sekunden.</p>
      </>
    );
  }

  const elapsed = Math.max(0, now - state.startedAt);
  const percent = 20 + Math.min(75, (elapsed / AI_EXPECTED_MS) * 75);
  const remaining = Math.max(0, Math.ceil((AI_EXPECTED_MS - elapsed) / 1000));
  const overdue = elapsed > AI_EXPECTED_MS;

  return (
    <>
      <div className="progress-row">
        <span className="spinner" aria-hidden="true" />
        <span>Claude analysiert die Übung…</span>
      </div>
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="progress-meta">
        {overdue
          ? "Dauert etwas länger als üblich, bitte kurz warten."
          : `Geschätzte Restdauer: ca. ${remaining} Sekunden`}
      </p>
    </>
  );
}

export function UploadAnalysis() {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [upstate, setUpstate] = useState<UploadState>({ phase: "idle" });
  const [analysis, setAnalysis] = useState<AnalysisState>({ phase: "idle" });
  const [tab, setTab] = useState<"scene" | "json">("scene");
  const [busy, setBusy] = useState(false);

  const file = preview?.file ?? null;
  const previewUrl = preview?.url ?? null;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function selectFile(next: File | null) {
    if (busy) return;
    setPreview(next ? { file: next, url: URL.createObjectURL(next) } : null);
    setStep(1);
    setUpstate({ phase: "idle" });
    setAnalysis({ phase: "idle" });
  }

  async function runUpload(): Promise<boolean> {
    if (!file) return false;
    setUpstate({ phase: "running", percentage: 0 });
    try {
      const pathname = `videos/${Date.now()}-${safeFileName(file.name)}`;
      const blob = await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/api/blob",
        contentType: file.type || "video/mp4",
        onUploadProgress: ({ percentage }) => {
          setUpstate({ phase: "running", percentage: Math.round(percentage) });
        },
      });
      setUpstate({ phase: "done", pathname: blob.pathname });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload fehlgeschlagen.";
      setUpstate({ phase: "error", message });
      return false;
    }
  }

  async function runAnalysis(): Promise<void> {
    if (!file) return;
    setAnalysis({ phase: "frames", framesDone: 0 });
    try {
      const frames = await extractFrames(file, FRAME_COUNT, 640, (framesDone) => {
        setAnalysis({ phase: "frames", framesDone });
      });
      setAnalysis({ phase: "ai", startedAt: Date.now() });
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

  // "Weiter": upload first, then analysis, each on its own step.
  async function startFlow() {
    if (!file || busy) return;
    setBusy(true);
    setStep(2);
    const uploaded = await runUpload();
    if (uploaded) {
      setStep(3);
      await runAnalysis();
    }
    setBusy(false);
  }

  async function retryUpload() {
    if (busy) return;
    setBusy(true);
    const uploaded = await runUpload();
    if (uploaded) {
      setStep(3);
      await runAnalysis();
    }
    setBusy(false);
  }

  async function retryAnalysis() {
    if (busy) return;
    setBusy(true);
    await runAnalysis();
    setBusy(false);
  }

  const sizeMb = file ? (file.size / 1024 / 1024).toFixed(1) : null;

  return (
    <div className="analysis">
      <section className="analysis__media">
        <label className="dropzone">
          <span>Video auswählen, MP4 oder MOV.</span>
          <input
            type="file"
            accept="video/*"
            disabled={busy}
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
        <ol className="stepper" aria-label="Fortschritt">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className={s.n === step ? "is-active" : s.n < step ? "is-done" : undefined}
              aria-current={s.n === step ? "step" : undefined}
            >
              <span className="stepper__num">{s.n}</span>
              {s.label}
            </li>
          ))}
        </ol>

        {step === 1 ? (
          <div className="card result-panel">
            <div className="section-title">Video prüfen</div>
            <p className="result-panel__text">
              {file
                ? "Passt die Vorschau? Mit Weiter wird das Video hochgeladen und danach analysiert."
                : "Wähle links ein Video aus. Danach erscheint hier die Vorschau."}
            </p>
            <div className="admin__actions">
              <button type="button" className="pill pill--ghost" disabled={!file} onClick={() => selectFile(null)}>
                Verwerfen
              </button>
              <button type="button" className="pill pill--solid" disabled={!file} onClick={startFlow}>
                Weiter
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="card result-panel">
            <div className="section-title">Upload</div>
            {upstate.phase === "error" ? (
              <>
                <p className="result-panel__text result-panel__text--error">Upload fehlgeschlagen: {upstate.message}</p>
                <div className="admin__actions">
                  <button type="button" className="pill pill--solid" disabled={busy} onClick={retryUpload}>
                    Erneut versuchen
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="progress-row">
                  <span className="spinner" aria-hidden="true" />
                  <span>
                    Video wird hochgeladen…{upstate.phase === "running" ? ` ${upstate.percentage} %` : ""}
                  </span>
                </div>
                <div className="progress" aria-hidden="true">
                  <span style={{ width: `${upstate.phase === "running" ? upstate.percentage : 0}%` }} />
                </div>
              </>
            )}
          </div>
        ) : null}

        {step === 3 ? (
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
              {analysis.phase === "frames" || analysis.phase === "ai" ? (
                <AnalysisProgress state={analysis} />
              ) : analysis.phase === "error" ? (
                <p className="result-panel__text result-panel__text--error">Analyse fehlgeschlagen: {analysis.message}</p>
              ) : analysis.phase === "done" ? (
                tab === "scene" ? (
                  <ExerciseScene exercise={analysis.exercise} />
                ) : (
                  <pre className="exercise-json">{JSON.stringify(analysis.exercise, null, 2)}</pre>
                )
              ) : null}
            </div>

            <div className="admin__actions">
              <button type="button" className="pill pill--ghost" disabled={busy} onClick={() => selectFile(null)}>
                Neues Video
              </button>
              {analysis.phase === "error" ? (
                <button type="button" className="pill pill--solid" disabled={busy} onClick={retryAnalysis}>
                  Erneut analysieren
                </button>
              ) : (
                <button type="button" className="pill pill--solid" disabled>
                  Übernehmen
                </button>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
