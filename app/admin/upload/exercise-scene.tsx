"use client";

import { useEffect, useState } from "react";
import type { Exercise } from "@/lib/exercise";
import { SceneSvg, teamLook, teamsOf } from "@/lib/exercise-scene-svg";

export { SceneSvg, teamLook, teamsOf };

export function ExerciseScene({
  exercise,
  showDetails = true,
  compact = false,
}: {
  exercise: Exercise;
  showDetails?: boolean;
  compact?: boolean;
}) {
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

  return (
    <div className={compact ? "exercise-scene exercise-scene--compact" : "exercise-scene"}>
      <SceneSvg exercise={exercise} time={time} />

      {teamsOf(exercise).length > 0 && !compact ? (
        <div className="tag-row">
          {teamsOf(exercise).map((team, _i, all) => {
            const look = teamLook(team, all);
            return (
              <span key={team} className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  aria-hidden="true"
                  style={{ width: 10, height: 10, borderRadius: "50%", background: look.fill, border: "1px solid #c8cdc8" }}
                />
                {team} · {exercise.people.filter((p) => p.team === team).length}
              </span>
            );
          })}
        </div>
      ) : null}

      {animated && !compact ? (
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

      {showDetails && !compact ? (
      <div className="exercise-details">
        {exercise.steps.length ? (
          <section>
            <h3 className="exercise-details__title">Ablauf</h3>
            <ol className="exercise-details__list">
              {exercise.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </section>
        ) : null}

        {exercise.equipment.length ? (
          <section>
            <h3 className="exercise-details__title">Material</h3>
            <ul className="exercise-details__list">
              {exercise.equipment.map((item, index) => (
                <li key={index}>
                  {item.count !== null ? `${item.count} × ` : ""}
                  {item.item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {exercise.coachingPoints.length ? (
          <section>
            <h3 className="exercise-details__title">Coaching-Punkte</h3>
            <ul className="exercise-details__list">
              {exercise.coachingPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      ) : null}

      {!compact && (exercise.confidence !== "high" || exercise.notes) ? (
        <p className="exercise-scene__note">
          Schätzung ({exercise.confidence === "low" ? "geringe" : "mittlere"} Sicherheit)
          {exercise.notes ? `: ${exercise.notes}` : "."}
        </p>
      ) : null}
    </div>
  );
}
