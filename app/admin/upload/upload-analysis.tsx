"use client";

import { useEffect, useState } from "react";

type Status = "empty" | "selected";

export function UploadAnalysis() {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [tab, setTab] = useState<"scene" | "json">("scene");

  const file = preview?.file ?? null;
  const previewUrl = preview?.url ?? null;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function selectFile(next: File | null) {
    setPreview(next ? { file: next, url: URL.createObjectURL(next) } : null);
  }

  const status: Status = file ? "selected" : "empty";
  const sizeMb = file ? (file.size / 1024 / 1024).toFixed(1) : null;

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
            {tab === "scene"
              ? status === "empty"
                ? "Nach dem Upload erscheint hier die Feldskizze aus dem Video."
                : "Die Analyse ist noch nicht angebunden. Die Feldskizze folgt, sobald die Pipeline steht."
              : "Das JSON im Schema coachbook.exercise/v1 erscheint hier nach der Analyse."}
          </div>

          <div className="result-panel__status">
            {status === "empty" ? "Warte auf Video" : "Video bereit, Analyse ausstehend"}
          </div>
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
          <button
            type="button"
            className="pill pill--ghost"
            disabled={!file}
            onClick={() => selectFile(null)}
          >
            Verwerfen
          </button>
          <button type="button" className="pill pill--solid" disabled>
            Übernehmen
          </button>
        </div>
      </section>
    </div>
  );
}
