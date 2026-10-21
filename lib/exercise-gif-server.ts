// Server-side twin of `exercise-gif.ts`: renders the animated field sketch to a looping GIF
// without a browser. Used when the app saves an exercise, because the phone cannot draw the sketch.
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { SceneSvg } from "@/lib/exercise-scene-svg";
import type { Exercise } from "@/lib/exercise";

const FPS = 12;
const MAX_SECONDS = 20;
// The GIF route accepts at most 4 MB.
const MAX_GIF_BYTES = 4_000_000;

// Player numbers are text; the serverless runtime has no system fonts, so one is shipped with the app.
const FONT_FILE = path.join(process.cwd(), "assets", "fonts", "Geist-Regular.ttf");

// resvg ignores `fitTo` when font options are set, so the size goes into the SVG itself.
function sized(markup: string, width: number): string {
  const match = /viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/.exec(markup);
  const aspect = match ? Number(match[4]) / Number(match[3]) : 1.5;
  return markup.replace("<svg ", `<svg width="${width}" height="${Math.round(width * aspect)}" `);
}

/** Renders the sketch (animated if it has 2+ keyframes) as a GIF. Retries smaller if it is too big. */
export function renderExerciseGifServer(exercise: Exercise): Uint8Array {
  const keyframes = exercise.keyframes;
  const duration =
    keyframes.length >= 2 ? Math.min(MAX_SECONDS, keyframes[keyframes.length - 1].t - keyframes[0].t) : 0;
  const count = duration > 0 ? Math.max(2, Math.round(duration * FPS)) : 1;

  const markups: string[] = [];
  for (let i = 0; i < count; i++) {
    const time = duration > 0 ? (duration * i) / count : 0;
    markups.push(renderToStaticMarkup(createElement(SceneSvg, { exercise, time, xmlns: true })));
  }

  for (const width of [360, 280, 220, 160]) {
    const gif = GIFEncoder();
    for (const markup of markups) {
      const rendered = new Resvg(sized(markup, width), {
        font: { fontFiles: [FONT_FILE], loadSystemFonts: false, defaultFontFamily: "Geist" },
      }).render();
      const rgba = new Uint8Array(rendered.pixels);
      const palette = quantize(rgba, 64);
      gif.writeFrame(applyPalette(rgba, palette), rendered.width, rendered.height, {
        palette,
        delay: Math.round(1000 / FPS),
      });
    }
    gif.finish();
    const bytes = gif.bytes();
    if (bytes.byteLength <= MAX_GIF_BYTES) return bytes;
  }
  throw new Error("GIF ist zu groß.");
}
