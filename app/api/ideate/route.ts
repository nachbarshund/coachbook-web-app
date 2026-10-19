import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth";
import { parseExerciseJson, type Exercise } from "@/lib/exercise";
import { EXERCISE_FIELD_RULES, EXERCISE_JSON_SHAPE } from "@/lib/exercise-prompt";

// A text idea (optionally with a photo or hand sketch) is a single model call, usually 10–40 seconds.
export const maxDuration = 120;

const MODEL = "claude-sonnet-5-5";
const MAX_IDEA_CHARS = 3000;
// Serverless request bodies are limited to 4.5 MB, base64 inflates by a third.
const MAX_IMAGE_CHARS = 4_000_000;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const SYSTEM_PROMPT = `You turn a youth football (soccer) coach's idea into ONE exercise as JSON. The idea is written text, optionally together with a photo or a hand sketch of the drill. There is no video.

${EXERCISE_JSON_SHAPE}

Rules:
${EXERCISE_FIELD_RULES}
- The idea decides everything it states: number of players, teams, field size, goals, materials, duration, age group. Take these literally. A game form such as "11 gegen 11" or "7 gegen 7" means that many players per team, so "people" lists all of them with "team" set (for example "A" and "B") and "playerCount" is the total. Do not shrink the game to fewer players to make the sketch simpler.
- Game forms (a match, a final game, small-sided games) are laid out with the goals at the two ends of the field, so the goals lie horizontally at y near 0 and y near 1. Place the teams in a plausible formation on their own half.
- Give every player an id: "p1", "p2", … or a number when the idea names one.
- If the idea says nothing about a detail, choose a sensible default for the age group and put it in "notes" ("angenommen: …"). Do not invent rules or materials the idea contradicts.
- A photo or sketch shows the layout: read positions, lines and labels from it and follow them over your own guesses. Handwritten text on it counts as part of the idea.
- "keyframes" has 3 to 6 entries with t = 0, 2, 4, … seconds. They show the core action of the drill in order: where every player in "people" is (same ids) and where the ball is. When the ball is passed, its position must change from keyframe to keyframe. For a game form, show a short attack from the build-up to the shot. Use null for the ball only if the drill has none.
- "steps" explain the drill as a coach would: set-up first, then the action.
- Set "confidence" to "high" only if the idea was specific enough that little was assumed.`;

type ImageInput = { data: string; mediaType: ImageType };

function readImage(value: unknown): ImageInput | null | "invalid" {
  if (value === undefined || value === null) return null;
  const record = value as { data?: unknown; mediaType?: unknown };
  if (typeof record.data !== "string" || record.data.length === 0 || record.data.length > MAX_IMAGE_CHARS) {
    return "invalid";
  }
  const mediaType = IMAGE_TYPES.find((type) => type === record.mediaType);
  return mediaType ? { data: record.data, mediaType } : "invalid";
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY ist nicht gesetzt." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as {
    idea?: unknown;
    image?: unknown;
    previous?: unknown;
    feedback?: unknown;
  } | null;

  const idea = typeof body?.idea === "string" ? body.idea.trim() : "";
  const image = readImage(body?.image);
  if (image === "invalid") {
    return NextResponse.json({ error: "Ungültiges Bild (JPEG, PNG, WebP oder GIF, max. 3 MB)." }, { status: 400 });
  }
  if (!idea && !image) {
    return NextResponse.json({ error: "Bitte eine Idee beschreiben oder ein Bild hochladen." }, { status: 400 });
  }
  if (idea.length > MAX_IDEA_CHARS) {
    return NextResponse.json({ error: "Die Beschreibung ist zu lang." }, { status: 400 });
  }

  // Revision round: the previous result plus the coach's correction.
  const feedback = typeof body?.feedback === "string" ? body.feedback.trim() : "";
  const previous = body?.previous && typeof body.previous === "object" ? (body.previous as Exercise) : null;
  if (feedback.length > MAX_IDEA_CHARS) {
    return NextResponse.json({ error: "Die Anweisung ist zu lang." }, { status: 400 });
  }

  const content: Anthropic.ContentBlockParam[] = [];
  if (image) {
    content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  }
  content.push({
    type: "text",
    text: idea ? `Idea:\n${idea}` : "There is no written idea. Use the picture only.",
  });
  if (previous && feedback) {
    content.push({
      type: "text",
      text: `Current version of the exercise:\n${JSON.stringify(previous)}\n\nChange it as follows and return the complete new JSON, keeping everything that is not mentioned:\n${feedback}`,
    });
  } else {
    content.push({ type: "text", text: "Return the exercise JSON." });
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: MODEL,
      // A 22-player game form with several keyframes is a long JSON object.
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n");

    try {
      return NextResponse.json({ exercise: parseExerciseJson(text) });
    } catch {
      return NextResponse.json({ error: "Antwort konnte nicht gelesen werden.", raw: text }, { status: 502 });
    }
  } catch (error) {
    console.error("Ideation failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Erzeugen fehlgeschlagen." }, { status: 502 });
  }
}
