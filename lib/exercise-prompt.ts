import { EXERCISE_SCHEMA_ID } from "@/lib/exercise";

// JSON shape and field rules shared by every prompt that returns a coachbook.exercise/v1 object
// (video analysis and idea/photo input). Source-specific rules stay with each route.
export const EXERCISE_JSON_SHAPE = `Return only a JSON object, no prose, no code fences. Use this shape:
{
  "schema": "${EXERCISE_SCHEMA_ID}",
  "title": string (German, max 4 words, e.g. "Passspiel Mitte–links"),
  "category": string | null (e.g. "Passspiel", "Torschuss", "Koordination"),
  "ageGroup": string | null (e.g. "F-Jugend"),
  "durationMinutes": number | null,
  "playerCount": number | null,
  "cones": [{ "id": string, "kind": "cone" | "pole", "x": number, "y": number }],
  "goals": [{ "id": string, "x": number, "y": number, "width": number, "orientation": "horizontal" | "vertical" }],
  "equipment": [{ "item": string (German, e.g. "Hütchen", "Stangen", "Mini-Tor", "Bälle", "Hemden"), "count": number | null }],
  "people": [{ "id": string, "team": string | null, "x": number, "y": number }],
  "movements": [{ "from": string, "to": { "x": number, "y": number }, "kind": "pass" | "run" | "dribble" }],
  "keyframes": [{ "t": number, "people": [{ "id": string, "x": number, "y": number }], "ball": { "x": number, "y": number } | null }],
  "steps": [string] (German, in order, each max 8 words, imperative, e.g. "Pass von Mitte nach links"),
  "coachingPoints": [string] (German),
  "confidence": "low" | "medium" | "high",
  "notes": string | null
}`;

export const EXERCISE_FIELD_RULES = `- Coordinates are normalized 0..1. x runs across the field from left to right, y runs along the field from top (0) to bottom (1), as seen from the camera.
- Cones: "cone" is a flat red disc on the grass. "pole" is a tall red stick with a base. Keep them apart; do not call a pole a cone.
- Goals: a goal is a frame with a net. Give its centre line position, its width as a fraction of the field width, and whether it lies horizontally (across the field) or vertically.
- Steps ("steps") are short, watch-friendly instructions in German, one drill action per step, in order.
- "movements" lists each pass or run once as "from" (player id) to a target point.`;
