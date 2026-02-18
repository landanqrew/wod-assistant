import { describe, it, expect, beforeEach } from "vitest";
import type Database_T from "better-sqlite3";
import { getTestDb } from "../db/connection.js";
import { ResultRepository } from "../db/result-repository.js";
import { BiasDetector } from "./bias-detector.js";
import type { WorkoutResult } from "../models/workout-result.js";
import { ScoreType } from "../models/workout.js";

function seedAthlete(db: Database_T.Database, id = "athlete_1"): void {
  db.prepare(
    "INSERT INTO athletes (id, name, sex) VALUES (?, ?, ?)"
  ).run(id, "Test Athlete", "male");
}

function seedWorkout(
  db: Database_T.Database,
  id: string,
  format = "amrap",
  scoreType = "rounds_and_reps"
): void {
  db.prepare(
    `INSERT INTO workouts (id, name, format, movements_json, score_type)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, `WOD ${id}`, format, "[]", scoreType);
}

function makeResult(overrides: Partial<WorkoutResult> = {}): WorkoutResult {
  return {
    id: `result_${Math.random().toString(36).slice(2, 8)}`,
    athleteId: "athlete_1",
    workoutId: "wod_1",
    performedAt: "2026-02-10T10:00:00Z",
    scoreType: ScoreType.RoundsAndReps,
    rx: true,
    movementResults: [],
    ...overrides,
  };
}

describe("BiasDetector", () => {
  let db: Database_T.Database;
  let resultRepo: ResultRepository;
  let detector: BiasDetector;

  beforeEach(() => {
    db = getTestDb();
    seedAthlete(db);
    seedWorkout(db, "wod_1", "amrap");
    seedWorkout(db, "wod_2", "for_time", "time");
    seedWorkout(db, "wod_3", "emom");
    resultRepo = new ResultRepository(db);
    detector = new BiasDetector(db);
  });

  it("returns empty insights when no data", () => {
    const report = detector.analyze("athlete_1", 30);
    expect(report.totalWorkouts).toBe(0);
    expect(report.insights).toHaveLength(0);
    db.close();
  });

  it("returns info insight when too few workouts for analysis", () => {
    resultRepo.save(
      makeResult({
        performedAt: new Date().toISOString(),
        movementResults: [
          { movementId: "back_squat", load: 225, reps: 10, rx: true },
        ],
      })
    );

    const report = detector.analyze("athlete_1", 30);
    expect(report.totalWorkouts).toBe(1);
    expect(report.insights.length).toBeGreaterThanOrEqual(1);
    expect(report.insights[0].severity).toBe("info");
    db.close();
  });

  it("detects missing modalities", () => {
    // All weightlifting, no gymnastics or monostructural
    for (let i = 0; i < 5; i++) {
      resultRepo.save(
        makeResult({
          id: `r_${i}`,
          performedAt: new Date().toISOString(),
          movementResults: [
            { movementId: "back_squat", load: 225, reps: 10, rx: true },
            { movementId: "deadlift", load: 315, reps: 5, rx: true },
          ],
        })
      );
    }

    const report = detector.analyze("athlete_1", 30);
    const modalityInsights = report.insights.filter(
      (i) => i.category === "modality"
    );
    // Should flag missing gymnastics, monostructural, strongman
    expect(modalityInsights.length).toBeGreaterThanOrEqual(2);
    db.close();
  });

  it("detects missing muscle groups", () => {
    // All squat/push, no pull or hinge
    for (let i = 0; i < 5; i++) {
      resultRepo.save(
        makeResult({
          id: `r_${i}`,
          performedAt: new Date().toISOString(),
          movementResults: [
            { movementId: "air_squat", reps: 20, rx: true },
            { movementId: "push_up", reps: 15, rx: true },
          ],
        })
      );
    }

    const report = detector.analyze("athlete_1", 30);
    const mgInsights = report.insights.filter(
      (i) => i.category === "muscle_group"
    );
    expect(mgInsights.length).toBeGreaterThanOrEqual(1);
    db.close();
  });

  it("computes modality distribution percentages", () => {
    for (let i = 0; i < 3; i++) {
      resultRepo.save(
        makeResult({
          id: `r_${i}`,
          performedAt: new Date().toISOString(),
          movementResults: [
            { movementId: "back_squat", load: 225, reps: 10, rx: true },
            { movementId: "pull_up", reps: 15, rx: true },
            { movementId: "run", reps: 1, rx: true },
          ],
        })
      );
    }

    const report = detector.analyze("athlete_1", 30);
    expect(report.modalityDistribution.weightlifting).toBeGreaterThan(0);
    expect(report.modalityDistribution.gymnastics).toBeGreaterThan(0);
    expect(report.modalityDistribution.monostructural).toBeGreaterThan(0);
    db.close();
  });

  it("computes movement frequency sorted by count", () => {
    for (let i = 0; i < 4; i++) {
      resultRepo.save(
        makeResult({
          id: `r_${i}`,
          performedAt: new Date().toISOString(),
          movementResults: [
            { movementId: "back_squat", load: 225, reps: 10, rx: true },
            ...(i < 2
              ? [{ movementId: "pull_up", reps: 10, rx: true as const }]
              : []),
          ],
        })
      );
    }

    const report = detector.analyze("athlete_1", 30);
    expect(report.movementFrequency[0].movementId).toBe("back_squat");
    expect(report.movementFrequency[0].count).toBe(4);
    db.close();
  });

  it("detects low training frequency", () => {
    // 1 workout in 14 days
    resultRepo.save(
      makeResult({
        performedAt: new Date().toISOString(),
        movementResults: [
          { movementId: "air_squat", reps: 20, rx: true },
          { movementId: "push_up", reps: 15, rx: true },
          { movementId: "pull_up", reps: 10, rx: true },
        ],
      })
    );
    resultRepo.save(
      makeResult({
        id: "r2",
        performedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        movementResults: [
          { movementId: "air_squat", reps: 20, rx: true },
          { movementId: "push_up", reps: 15, rx: true },
          { movementId: "pull_up", reps: 10, rx: true },
        ],
      })
    );
    resultRepo.save(
      makeResult({
        id: "r3",
        performedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        movementResults: [
          { movementId: "air_squat", reps: 20, rx: true },
          { movementId: "push_up", reps: 15, rx: true },
          { movementId: "pull_up", reps: 10, rx: true },
        ],
      })
    );

    const report = detector.analyze("athlete_1", 14);
    const freqInsights = report.insights.filter(
      (i) => i.category === "frequency"
    );
    expect(freqInsights.length).toBeGreaterThanOrEqual(1);
    db.close();
  });

  it("detects format bias when one format dominates", () => {
    for (let i = 0; i < 6; i++) {
      resultRepo.save(
        makeResult({
          id: `r_${i}`,
          workoutId: "wod_1", // all amrap
          performedAt: new Date(Date.now() - i * 86400000).toISOString(),
          movementResults: [
            { movementId: "air_squat", reps: 20, rx: true },
            { movementId: "push_up", reps: 15, rx: true },
            { movementId: "pull_up", reps: 10, rx: true },
          ],
        })
      );
    }

    const report = detector.analyze("athlete_1", 30);
    const formatInsights = report.insights.filter(
      (i) => i.category === "format"
    );
    expect(formatInsights.length).toBeGreaterThanOrEqual(1);
    db.close();
  });
});
