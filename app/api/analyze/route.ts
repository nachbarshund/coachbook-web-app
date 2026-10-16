import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth";
import { EXERCISE_SCHEMA_ID, parseExerciseJson } from "@/lib/exercise";

// Analysis of up to 20 frames usually takes 15–60 seconds.
export const maxDuration = 120;

const MODEL = "claude-sonnet-5-5";
const MIN_FRAMES = 3;
const MAX_FRAMES = 20;

const SYSTEM_PROMPT = `You analyze frames from a short youth football (soccer) training video and return ONE exercise as JSON.

Return only a JSON object, no prose, no code fences. Use this shape:
{
  "schema": "${EXERCISE_SCHEMA_ID}",
  "title": string (German, short),
  "category": string | null (e.g. "Passspiel", "Torschuss", "Koordination"),
  "ageGroup": string | null (e.g. "F-Jugend"),
  "durationMinutes": number | null,
  "playerCount": number | null,
  "cones": [{ "id": string, "kind": "cone" | "pole", "x": number, "y": number }],
  "goals": [{ "id": string, "x": number, "y": number, "width": number, "orientation": "horizontal" | "vertical" }],
  "people": [{ "id": string, "team": string | null, "x": number, "y": number }],
  "movements": [{ "from": string, "to": { "x": number, "y": number }, "kind": "pass" | "run" | "dribble" }],
  "keyframes": [{ "t": number, "people": [{ "id": string, "x": number, "y": number }], "ball": { "x": number, "y": number } | null }],
  "steps": [string] (German, in order),
  "coachingPoints": [string] (German),
  "confidence": "low" | "medium" | "high",
  "notes": string | null
}

Rules:
- Coordinates are normalized 0..1. x runs across the field from left to right, y runs along the field from top (0) to bottom (1), as seen from the camera.
- Cones: "cone" is a flat red disc on the grass. "pole" is a tall red stick with a base. Keep them apart; do not call a pole a cone.
- Goals: a goal is a frame with a net. Give its centre line position, its width as a fraction of the field width, and whether it lies horizontally (across the field) or vertically.
- Use the visible jersey number as the player "id" when it is readable (e.g. "3"). Otherwise use "p1", "p2", …
- "people" lists every player once, with their position in the first frame.
- "keyframes" has exactly one entry per input frame, in the same order, using the t value given for that frame. Each entry lists the position of every visible player (same ids as in "people") and the ball.
- Track the BALL in every frame. Passes are the core of most drills: when the ball moves from one player to another (for example from the centre to the left), its position must change from keyframe to keyframe. When the ball is in flight, estimate its position on the line between the two players. Use null only if the ball is really not visible.
- "movements" lists each pass or run once as "from" (player id) to a target point.
- If something is not visible, leave it out and say so in "notes". Do not invent details. Use null for unknown values. Set "confidence" honestly.`;

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY ist nicht gesetzt." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { frames?: unknown } | null;
  const frames = Array.isArray(body?.frames)
    ? body.frames.flatMap((frame) => {
        const record = frame as { data?: unknown; t?: unknown } | null;
        return typeof record?.data === "string" && typeof record?.t === "number"
          ? [{ data: record.data, t: record.t }]
          : [];
      })
    : [];
  if (frames.length < MIN_FRAMES || frames.length > MAX_FRAMES) {
    return NextResponse.json({ error: "Ungültige Anzahl Frames." }, { status: 400 });
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            ...frames.flatMap((frame, index) => [
              { type: "text" as const, text: `Frame ${index + 1} at t=${frame.t.toFixed(2)} s` },
              {
                type: "image" as const,
                source: { type: "base64" as const, media_type: "image/jpeg" as const, data: frame.data },
              },
            ]),
            {
              type: "text" as const,
              text: "The frames above are evenly spaced frames from one training video, in order. Return the exercise JSON including keyframes for each frame and the ball track.",
            },
          ],
        },
      ],
    });

    const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n");

    try {
      return NextResponse.json({ exercise: parseExerciseJson(text) });
    } catch {
      return NextResponse.json({ error: "Antwort konnte nicht gelesen werden.", raw: text }, { status: 502 });
    }
  } catch (error) {
    console.error("Analysis failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Analyse fehlgeschlagen." }, { status: 502 });
  }
}
