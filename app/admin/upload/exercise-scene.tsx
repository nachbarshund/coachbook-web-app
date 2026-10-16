import type { Exercise, Point } from "@/lib/exercise";

// Field sketch from the structured exercise. Viewbox 100 × 150 (field portrait).
const W = 100;
const H = 150;
const toX = (p: Point) => p.x * W;
const toY = (p: Point) => p.y * H;

const TEAM_COLORS: Record<string, string> = {
  A: "#14804a",
  B: "#f2b01e",
  C: "#5b8def",
};
const DEFAULT_COLOR = "#111412";

export function ExerciseScene({ exercise }: { exercise: Exercise }) {
  const byId = new Map<string, Point>();
  exercise.people.forEach((p) => byId.set(p.id, p));
  exercise.cones.forEach((c) => byId.set(c.id, c));

  return (
    <div className="exercise-scene">
      <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} role="img" aria-label={`Feldskizze: ${exercise.title}`}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>

        <rect x={0} y={0} width={W} height={H} fill="none" stroke="currentColor" strokeWidth={0.6} opacity={0.5} />
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="currentColor" strokeWidth={0.4} opacity={0.35} />
        <circle cx={W / 2} cy={H / 2} r={9} fill="none" stroke="currentColor" strokeWidth={0.4} opacity={0.35} />

        {exercise.movements.map((m, index) => {
          const from = byId.get(m.from);
          if (!from) return null;
          return (
            <line
              key={`m${index}`}
              x1={toX(from)}
              y1={toY(from)}
              x2={toX(m.to)}
              y2={toY(m.to)}
              stroke={m.kind === "pass" ? "#14804a" : m.kind === "dribble" ? "#f2b01e" : "#111412"}
              strokeWidth={0.9}
              strokeDasharray={m.kind === "dribble" ? "2 1.5" : undefined}
              markerEnd="url(#arrow)"
              color={m.kind === "pass" ? "#14804a" : m.kind === "dribble" ? "#f2b01e" : "#111412"}
            />
          );
        })}

        {exercise.cones.map((c) => (
          <polygon
            key={c.id}
            points={`${toX(c) - 1.6},${toY(c) + 1.4} ${toX(c) + 1.6},${toY(c) + 1.4} ${toX(c)},${toY(c) - 1.6}`}
            fill="#f2b01e"
          />
        ))}

        {exercise.people.map((p) => (
          <g key={p.id}>
            <circle cx={toX(p)} cy={toY(p)} r={3} fill={(p.team && TEAM_COLORS[p.team]) || DEFAULT_COLOR} />
            <text x={toX(p)} y={toY(p) + 0.9} fontSize={3} textAnchor="middle" fill="#ffffff">
              {p.id}
            </text>
          </g>
        ))}
      </svg>
      {exercise.confidence !== "high" || exercise.notes ? (
        <p className="exercise-scene__note">
          Schätzung ({exercise.confidence === "low" ? "geringe" : "mittlere"} Sicherheit)
          {exercise.notes ? `: ${exercise.notes}` : "."}
        </p>
      ) : null}
    </div>
  );
}
