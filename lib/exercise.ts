// Schema coachbook.exercise/v1: a single training exercise as structured data.
// Coordinates are normalized to 0..1. x runs across the field (left to right),
// y runs along the field (0 = top, 1 = bottom) as seen from the camera.

export const EXERCISE_SCHEMA_ID = "coachbook.exercise/v1" as const;

// Fixed classification axes. The raw values are stable keys (stored in JSON, API and
// the iOS app); the German labels are for display only. Both axes are optional in the
// schema so exercises created before this extension stay valid.
export const EXERCISE_PHASES = ["warmup", "main", "match", "cooldown"] as const;
export type ExercisePhase = (typeof EXERCISE_PHASES)[number];

export const EXERCISE_TOPICS = [
  "passing",
  "dribbling",
  "finishing",
  "defending",
  "coordination",
  "smallsided",
] as const;
export type ExerciseTopic = (typeof EXERCISE_TOPICS)[number];

export const EXERCISE_PHASE_LABELS: Record<ExercisePhase, string> = {
  warmup: "Aufwärmen",
  main: "Hauptteil",
  match: "Abschlussspiel",
  cooldown: "Ausklang",
};

export const EXERCISE_TOPIC_LABELS: Record<ExerciseTopic, string> = {
  passing: "Passen",
  dribbling: "Dribbling/Ballführung",
  finishing: "Torabschluss",
  defending: "Verteidigen",
  coordination: "Koordination",
  smallsided: "Spielform",
};

export function parsePhase(value: unknown): ExercisePhase | null {
  return (EXERCISE_PHASES as readonly unknown[]).includes(value) ? (value as ExercisePhase) : null;
}

export function parseTopic(value: unknown): ExerciseTopic | null {
  return (EXERCISE_TOPICS as readonly unknown[]).includes(value) ? (value as ExerciseTopic) : null;
}

export type Point = { x: number; y: number };

export type Cone = Point & { id: string; kind: "cone" | "pole" };

export type Goal = Point & {
  id: string;
  width: number; // fraction of the field width
  orientation: "horizontal" | "vertical";
};

export type Keyframe = {
  t: number; // seconds in the source video
  people: (Point & { id: string })[];
  ball: Point | null;
};

export type Exercise = {
  schema: typeof EXERCISE_SCHEMA_ID;
  title: string;
  category: string | null; // legacy free text, kept for backwards compatibility
  // Optional because records saved before this extension have neither key.
  phase?: ExercisePhase | null; // where in the session: warmup, main, match, cooldown
  topic?: ExerciseTopic | null; // what is trained: one main topic
  ageGroup: string | null;
  durationMinutes: number | null;
  playerCount: number | null;
  cones: Cone[];
  goals: Goal[];
  equipment: { item: string; count: number | null }[];
  people: (Point & { id: string; team: string | null })[];
  movements: { from: string; to: Point; kind: "pass" | "run" | "dribble" }[];
  keyframes: Keyframe[];
  steps: string[];
  coachingPoints: string[];
  confidence: "low" | "medium" | "high";
  notes: string | null;
};

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const str = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const num = (value: unknown): number | null => (isNumber(value) ? value : null);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

function point(value: unknown): Point | null {
  if (!value || typeof value !== "object") return null;
  const { x, y } = value as { x: unknown; y: unknown };
  if (!isNumber(x) || !isNumber(y)) return null;
  return { x: clamp01(x), y: clamp01(y) };
}

/**
 * Extracts and validates the exercise JSON from a model response.
 * Unknown or malformed items are dropped instead of failing the whole result.
 */
export function parseExerciseJson(raw: string): Exercise {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in response");

  const data = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  if (data.schema !== EXERCISE_SCHEMA_ID) throw new Error("Unexpected schema");

  const cones: Cone[] = list(data.cones).flatMap((item, index) => {
    const p = point(item);
    if (!p) return [];
    const record = item as { id?: unknown; kind?: unknown };
    const kind: "cone" | "pole" = record.kind === "pole" ? "pole" : "cone";
    return [{ id: str(record.id) ?? `c${index + 1}`, kind, ...p }];
  });

  const goals: Goal[] = list(data.goals).flatMap((item, index) => {
    const p = point(item);
    const record = item as { id?: unknown; width?: unknown; orientation?: unknown };
    if (!p || !isNumber(record.width)) return [];
    return [
      {
        id: str(record.id) ?? `g${index + 1}`,
        width: clamp01(record.width),
        orientation: record.orientation === "vertical" ? "vertical" : "horizontal",
        ...p,
      },
    ];
  });

  const equipment = list(data.equipment).flatMap((item) => {
    const record = item as { item?: unknown; count?: unknown };
    const name = str(record.item);
    return name ? [{ item: name, count: num(record.count) }] : [];
  });

  const people = list(data.people).flatMap((item, index) => {
    const p = point(item);
    if (!p) return [];
    const record = item as { id?: unknown; team?: unknown };
    return [{ id: str(record.id) ?? `p${index + 1}`, team: str(record.team), ...p }];
  });

  const movements = list(data.movements).flatMap((item) => {
    const record = item as { from?: unknown; to?: unknown; kind?: unknown };
    const to = point(record.to);
    const from = str(record.from);
    if (!to || !from) return [];
    const kind: "pass" | "run" | "dribble" =
      record.kind === "pass" || record.kind === "dribble" ? record.kind : "run";
    return [{ from, to, kind }];
  });

  const keyframes = list(data.keyframes)
    .flatMap((item) => {
      const record = item as { t?: unknown; people?: unknown; ball?: unknown };
      if (!isNumber(record.t)) return [];
      const framePeople = list(record.people).flatMap((p, index) => {
        const pt = point(p);
        if (!pt) return [];
        return [{ id: str((p as { id?: unknown }).id) ?? `p${index + 1}`, ...pt }];
      });
      return [{ t: Math.max(0, record.t), people: framePeople, ball: point(record.ball) }];
    })
    .sort((a, b) => a.t - b.t);

  const confidence = data.confidence === "high" || data.confidence === "medium" ? data.confidence : "low";

  return {
    schema: EXERCISE_SCHEMA_ID,
    title: str(data.title) ?? "Unbenannte Übung",
    category: str(data.category),
    phase: parsePhase(data.phase),
    topic: parseTopic(data.topic),
    ageGroup: str(data.ageGroup),
    durationMinutes: num(data.durationMinutes),
    playerCount: num(data.playerCount),
    cones,
    goals,
    equipment,
    people,
    movements,
    keyframes,
    steps: list(data.steps).flatMap((s) => (str(s) ? [str(s) as string] : [])),
    coachingPoints: list(data.coachingPoints).flatMap((s) => (str(s) ? [str(s) as string] : [])),
    confidence,
    notes: str(data.notes),
  };
}
