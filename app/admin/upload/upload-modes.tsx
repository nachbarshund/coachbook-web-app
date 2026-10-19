"use client";

import { useState } from "react";
import { IdeaInput } from "./idea-input";
import { UploadAnalysis } from "./upload-analysis";

type Mode = "video" | "idea";

// Both inputs stay mounted so switching the tab does not throw away an upload or a result.
export function UploadModes() {
  const [mode, setMode] = useState<Mode>("video");

  return (
    <>
      <div className="result-panel__tabs" role="tablist" aria-label="Eingang">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "video"}
          className={mode === "video" ? "pill pill--solid" : "pill pill--ghost"}
          onClick={() => setMode("video")}
        >
          Video
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "idea"}
          className={mode === "idea" ? "pill pill--solid" : "pill pill--ghost"}
          onClick={() => setMode("idea")}
        >
          Idee oder Skizze
        </button>
      </div>

      <div hidden={mode !== "video"}>
        <UploadAnalysis />
      </div>
      <div hidden={mode !== "idea"}>
        <IdeaInput />
      </div>
    </>
  );
}
