"use client";

import { useEffect, useState } from "react";
import type { Exercise, Keyframe, Point } from "@/lib/exercise";

// Field sketch. Viewbox 100 × 150 (portrait pitch).
const W = 100;
const H = 150;
const toX = (p: Point) => p.x * W;
const toY = (p: Point) => p.y * H;
const lerp = (p: Point, q: Point, t: number): Point => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

type Pose = { people: Map<string, Point>; ball: Point | null };

// Interpolates player and ball positions between keyframes at `time` seconds after the first keyframe.
function poseAt(frames: Keyframe[], time: number): Pose {
  const first = frames[0];
  const last = frames[frames.length - 1];
  const at = first.t + Math.min(time, last.t - first.t);

  let a = last;
  let b = last;
  let alpha = 0;
  for (let i = 0; i < frames.length - 1; i++) {
    if (at <= frames[i + 1].t) {
      a = frames[i];
      b = frames[i + 1];
      alpha = (at - a.t) / Math.max(1e-6, b.t - a.t);
      break;
    }
  }

  const people = new Map<string, Point>();
  for (const p of b.people) {
    const prev = a.people.find((q) => q.id === p.id);
    people.set(p.id, prev ? lerp(prev, p, alpha) : p);
  }
  for (const p of a.people) {
    if (!people.has(p.id)) people.set(p.id, p);
  }

  const ball = a.ball && b.ball ? lerp(a.ball, b.ball, alpha) : (a.ball ?? b.ball ?? null);
  return { people, ball };
}

function Pitch() {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={i * 10} y={0} width={10} height={H} fill={i % 2 === 0 ? "#7c9a4f" : "#88a65d"} />
      ))}
      <rect x={0} y={0} width={W} height={H} fill="none" stroke="#ffffff" strokeWidth={0.6} opacity={0.75} />
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#ffffff" strokeWidth={0.5} opacity={0.75} />
      <circle cx={W / 2} cy={H / 2} r={9} fill="none" stroke="#ffffff" strokeWidth={0.5} opacity={0.75} />
    </>
  );
}

function Player({ at, label, team }: { at: Point; label: string; team: string | null }) {
  return (
    <g transform={`translate(${toX(at)} ${toY(at)})`}>
      <circle r={3.4} fill={team === "B" ? "url(#shirt-red)" : "url(#shirt-blue)"} stroke="#0f1f3a" strokeWidth={0.4} />
      <text
        y={1.2}
        fontSize={3.6}
        fontWeight={700}
        textAnchor="middle"
        fill="#ffffff"
        stroke="#0f1f3a"
        strokeWidth={0.6}
        paintOrder="stroke"
      >
        {label}
      </text>
    </g>
  );
}

function Ball({ at }: { at: Point }) {
  return (
    <g transform={`translate(${toX(at)} ${toY(at)})`}>
      <circle r={1.6} fill="#ffffff" stroke="#111412" strokeWidth={0.35} />
      <circle r={0.6} fill="#111412" />
    </g>
  );
}

function Cone({ at }: { at: Point }) {
  return <ellipse cx={toX(at)} cy={toY(at)} rx={1.5} ry={0.7} fill="#d62b2b" stroke="#8a1212" strokeWidth={0.2} />;
}

export function ExerciseScene({ exercise }: { exercise: Exercise }) {
  const frames = exercise.keyframes;
  const animated = frames.length >= 2;
  const duration = animated ? frames[frames.length - 1].t - frames[0].t : 0;

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(animated);

  useEffect(() => {
    if (!playing || !animated || duration <= 0) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((prev) => (prev + dt) % duration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, animated, duration]);

  const pose = animated ? poseAt(frames, time) : null;
  const shownBall = pose ? pose.ball : null;

  return (
    <div className="exercise-scene">
      <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} role="img" aria-label={`Feldskizze: ${exercise.title}`}>
        <defs>
          <pattern id="shirt-blue" width="1.6" height="1.6" patternUnits="userSpaceOnUse">
            <rect width="0.8" height="1.6" fill="#1f4f9a" />
            <rect x="0.8" width="0.8" height="1.6" fill="#f2f4f7" />
          </pattern>
          <pattern id="shirt-red" width="1.6" height="1.6" patternUnits="userSpaceOnUse">
            <rect width="0.8" height="1.6" fill="#c8102e" />
            <rect x="0.8" width="0.8" height="1.6" fill="#f2f4f7" />
          </pattern>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffffff" />
          </marker>
        </defs>

        <Pitch />

        {!animated
          ? exercise.movements.map((m, index) => {
              const from = exercise.people.find((p) => p.id === m.from) ?? exercise.cones.find((c) => c.id === m.from);
              if (!from) return null;
              return (
                <line
                  key={`m${index}`}
                  x1={toX(from)}
                  y1={toY(from)}
                  x2={toX(m.to)}
                  y2={toY(m.to)}
                  stroke={m.kind === "pass" ? "#ffe066" : "#ffffff"}
                  strokeWidth={0.9}
                  strokeDasharray={m.kind === "dribble" ? "2 1.5" : undefined}
                  markerEnd="url(#arrow)"
                />
              );
            })
          : null}

        {exercise.cones.map((c) => (
          <Cone key={c.id} at={c} />
        ))}

        {exercise.people.map((p) => (
          <Player key={p.id} at={pose?.people.get(p.id) ?? p} label={p.id.replace(/^p(?=\d)/, "")} team={p.team} />
        ))}

        {shownBall ? <Ball at={shownBall} /> : null}
      </svg>

      {animated ? (
        <div className="exercise-player">
          <button type="button" className="pill pill--ghost" onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause" : "Abspielen"}
          </button>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={time}
            aria-label="Zeitpunkt"
            onChange={(event) => {
              setPlaying(false);
              setTime(Number(event.target.value));
            }}
          />
          <span className="exercise-player__time">
            {time.toFixed(1)} / {duration.toFixed(1)} s
          </span>
        </div>
      ) : null}

      {exercise.confidence !== "high" || exercise.notes ? (
        <p className="exercise-scene__note">
          Schätzung ({exercise.confidence === "low" ? "geringe" : "mittlere"} Sicherheit)
          {exercise.notes ? `: ${exercise.notes}` : "."}
        </p>
      ) : null}
    </div>
  );
}
