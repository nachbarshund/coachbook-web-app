// Browser-only: renders the animated field sketch to a looping GIF.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { SceneSvg } from "@/app/admin/upload/exercise-scene";
import type { Exercise } from "@/lib/exercise";

const FPS = 12;
const MAX_SECONDS = 20;
// The upload route accepts at most 4 MB (serverless body limit is 4.5 MB).
export const MAX_GIF_BYTES = 4_000_000;

function loadSvg(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Skizze konnte nicht gerendert werden."));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

function encode(frames: ImageData[], width: number, height: number): Uint8Array {
  const gif = GIFEncoder();
  for (const frame of frames) {
    const palette = quantize(frame.data, 64);
    gif.writeFrame(applyPalette(frame.data, palette), width, height, { palette, delay: Math.round(1000 / FPS) });
  }
  gif.finish();
  return gif.bytes();
}

/** Renders the sketch (animated if it has 2+ keyframes) as a GIF. Retries smaller if it is too big. */
export async function renderExerciseGif(exercise: Exercise): Promise<Blob> {
  const keyframes = exercise.keyframes;
  const duration =
    keyframes.length >= 2 ? Math.min(MAX_SECONDS, keyframes[keyframes.length - 1].t - keyframes[0].t) : 0;
  const count = duration > 0 ? Math.max(2, Math.round(duration * FPS)) : 1;
  const aspect = exercise.goals.length ? 158 / 108 : 1.5;

  // Rasterise each frame once at the largest size, then downscale on retries.
  const images: HTMLImageElement[] = [];
  for (let i = 0; i < count; i++) {
    const time = duration > 0 ? (duration * i) / count : 0;
    images.push(await loadSvg(renderToStaticMarkup(createElement(SceneSvg, { exercise, time, xmlns: true }))));
  }

  for (const width of [360, 280, 220, 160]) {
    const height = Math.round(width * aspect);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas ist nicht verfügbar.");

    const frames = images.map((image) => {
      ctx.drawImage(image, 0, 0, width, height);
      return ctx.getImageData(0, 0, width, height);
    });
    const bytes = encode(frames, width, height);
    if (bytes.byteLength <= MAX_GIF_BYTES) {
      return new Blob([bytes as BlobPart], { type: "image/gif" });
    }
  }
  throw new Error("GIF ist zu groß.");
}
