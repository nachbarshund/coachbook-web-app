"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { extractFrames } from "@/lib/extract-frames";
import type { Exercise } from "@/lib/exercise";
import { ExerciseScene } from "./exercise-scene";

const FRAME_COUNT = 8;
// Typical duration of the AI step; used only for the estimate shown to the user.
const AI_EXPECTED_MS = 35_000;

type Tab = "video" | "analyse";
type UploadState =
  | { phase: "idle" }
  | { phase: "running"; percentage: number }
  | { phase: "done" }
  | { phase: "error"; message: string };
type AnalysisState =
  | { phase: "idle" }
  | { phase: "frames"; framesDone: number }
  | { phase: "ai"; startedAt: number }
  | { phase: "done"; exercise: Exercise }
  | { phase: "error"; message: string };

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
      <div className="analysis-progress">
        <span className="spinner" aria-hidden="true" />
        <p className="analysis-progress__title">Frames werden aus dem Video gezogen ({state.framesDone}/{FRAME_COUNT})</p>
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="progress-meta">Dauert nur wenige Sekunden.</p>
      </div>
    );
  }

  const elapsed = Math.max(0, now - state.startedAt);
  const percent = 20 + Math.min(75, (elapsed / AI_EXPECTED_MS) * 75);
  const remaining = Math.max(0, Math.ceil((AI_EXPECTED_MS - elapsed) / 1000));
  const overdue = elapsed > AI_EXPECTED_MS;

  return (
    <div className="analysis-progress">
      <span className="spinner" aria-hidden="true" />
      <p className="analysis-progress__title">Claude analysiert die Übung…</p>
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="progress-meta">
        {overdue
          ? "Dauert etwas länger als üblich, bitte kurz warten."
          : `Geschätzte Restdauer: ca. ${remaining} Sekunden`}
      </p>
    </div>
  );
}

export function UploadAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("video");
  const [upstate, setUpstate] = useState<UploadState>({ phase: "idle" });
  const [analysis, setAnalysis] = useState<AnalysisState>({ phase: "idle" });
  const [resultTab, setResultTab] = useState<"scene" | "json">("scene");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const uploading = upstate.phase === "running";
  const analysing = analysis.phase === "frames" || analysis.phase === "ai";
  const busy = uploading || analysing;
  const uploaded = upstate.phase === "done";
  const sizeMb = file ? (file.size / 1024 / 1024).toFixed(1) : null;

  // Upload starts right after choosing the file; the preview appears once it is stored.
  async function chooseFile(next: File) {
    if (busy) return;
    setFile(next);
    setAnalysis({ phase: "idle" });
    setTab("video");
    await runUpload(next);
  }

  async function runUpload(target: File) {
    setUpstate({ phase: "running", percentage: 0 });
    try {
      const pathname = `videos/${Date.now()}-${safeFileName(target.name)}`;
      await upload(pathname, target, {
        access: "private",
        handleUploadUrl: "/api/blob",
        contentType: target.type || "video/mp4",
        onUploadProgress: ({ percentage }) => {
          setUpstate({ phase: "running", percentage: Math.round(percentage) });
        },
      });
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(target);
      });
      setUpstate({ phase: "done" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload fehlgeschlagen.";
      setUpstate({ phase: "error", message });
    }
  }

  async function runAnalysis(target: File) {
    setAnalysis({ phase: "frames", framesDone: 0 });
    try {
      const frames = await extractFrames(target, FRAME_COUNT, 640, (framesDone) => {
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
      setResultTab("scene");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analyse fehlgeschlagen.";
      setAnalysis({ phase: "error", message });
    }
  }

  function goToAnalysis() {
    if (!file || !uploaded || busy) return;
    setTab("analyse");
    void runAnalysis(file);
  }

  function reset() {
    if (busy) return;
    setFile(null);
    setPreviewUrl(null);
    setUpstate({ phase: "idle" });
    setAnalysis({ phase: "idle" });
    setTab("video");
  }

  const showDropzone = tab === "video" && !file;
  const showRight = tab === "analyse" || file !== null;

  return (
    <div className="analysis-wrap">
      <div className="stepper" role="tablist" aria-label="Schritte">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "video"}
          className={tab === "video" ? "is-active" : uploaded ? "is-done" : undefined}
          onClick={() => !busy && setTab("video")}
          disabled={busy && tab !== "video"}
        >
          <span className="stepper__num">1</span>
          Video
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "analyse"}
          className={tab === "analyse" ? "is-active" : analysis.phase === "done" ? "is-done" : undefined}
          disabled={!uploaded}
          onClick={() => setTab("analyse")}
        >
          <span className="stepper__num">2</span>
          Analyse
        </button>
      </div>

      <div className={`analysis${showRight ? "" : " analysis--single"}`}>
        <section className="analysis__media">
          {showDropzone ? (
            <label className="dropzone">
              <span>Video auswählen, MP4 oder MOV.</span>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  if (next) void chooseFile(next);
                }}
              />
            </label>
          ) : null}

          {previewUrl ? (
            <>
              <div className="video-frame">
                <video src={previewUrl} controls playsInline preload="metadata" />
              </div>
              <div className="tag-row">
                <span className="chip chip--pitch">{file?.name}</span>
                <span className="chip">{sizeMb} MB</span>
              </div>
            </>
          ) : file && tab === "video" ? (
            <div className="tag-row">
              <span className="chip chip--pitch">{file.name}</span>
              <span className="chip">{sizeMb} MB</span>
            </div>
          ) : null}
        </section>

        {showRight ? (
          <section className="analysis__result">
            {tab === "video" && file ? (
              <div className="card result-panel">
                <div className="section-title">Upload</div>
                {upstate.phase === "error" ? (
                  <>
                    <p className="result-panel__text result-panel__text--error">Upload fehlgeschlagen: {upstate.message}</p>
                    <div className="admin__actions">
                      <button type="button" className="pill pill--ghost" onClick={reset}>
                        Verwerfen
                      </button>
                      <button type="button" className="pill pill--solid" onClick={() => void runUpload(file)}>
                        Erneut versuchen
                      </button>
                    </div>
                  </>
                ) : uploading ? (
                  <>
                    <div className="progress-row">
                      <span className="spinner" aria-hidden="true" />
                      <span>Video wird hochgeladen… {upstate.phase === "running" ? `${upstate.percentage} %` : ""}</span>
                    </div>
                    <div className="progress" aria-hidden="true">
                      <span style={{ width: `${upstate.phase === "running" ? upstate.percentage : 0}%` }} />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="result-panel__text">Video hochgeladen. Passt die Vorschau, geht es mit Weiter zur Analyse.</p>
                    <div className="admin__actions">
                      <button type="button" className="pill pill--ghost" onClick={reset}>
                        Verwerfen
                      </button>
                      <button type="button" className="pill pill--solid" disabled={!uploaded} onClick={goToAnalysis}>
                        Weiter
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="card result-panel">
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
                  {analysing ? (
                    <AnalysisProgress state={analysis} />
                  ) : analysis.phase === "error" ? (
                    <p className="result-panel__text result-panel__text--error">Analyse fehlgeschlagen: {analysis.message}</p>
                  ) : analysis.phase === "done" ? (
                    resultTab === "scene" ? (
                      <ExerciseScene exercise={analysis.exercise} />
                    ) : (
                      <pre className="exercise-json">{JSON.stringify(analysis.exercise, null, 2)}</pre>
                    )
                  ) : (
                    <p className="result-panel__text">Die Analyse startet automatisch.</p>
                  )}
                </div>

                <div className="admin__actions">
                  <button type="button" className="pill pill--ghost" disabled={busy} onClick={reset}>
                    Neues Video
                  </button>
                  {analysis.phase === "error" && file ? (
                    <button type="button" className="pill pill--solid" onClick={() => void runAnalysis(file)}>
                      Erneut analysieren
                    </button>
                  ) : (
                    <button type="button" className="pill pill--solid" disabled>
                      Übernehmen
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
