import { describe, it, expect, beforeEach } from "vitest";
import type Database_T from "better-sqlite3";
import { getTestDb } from "../db/connection.js";
import { ResultRepository } from "../db/result-repository.js";
import { FatigueTracker } from "./fatigue-tracker.js";
import type { WorkoutResult } from "../models/workout-result.js";
import { ScoreType } from "../models/workout.js";

function seedAthlete(db: Database_T.Database, id = "athlete_1"): void {
  db.prepare(
    "INSERT INTO athletes (id, name, sex) VALUES (?, ?, ?)"
  ).run(id, "Test Athlete", "male");
}

function seedWorkout(db: Database_T.Database, id = "wod_1"): void {
  db.prepare(
    `INSERT INTO workouts (id, name, format, movements_json, score_type)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, "Test WOD", "amrap", "[]", "rounds_and_reps");
}

function makeResult(overrides: Partial<WorkoutResult> = {}): WorkoutResult {
  return {
    id: `result_${Math.random().toString(36).slice(2, 8)}`,
    athleteId: "athlete_1",
    workoutId: "wod_1",
    performedAt: new Date().toISOString(),
    scoreType: ScoreType.RoundsAndReps,
    rx: true,
    movementResults: [],
    ...overrides,
  };
}

describe("FatigueTracker", () => {
  let db: Database_T.Database;
  let resultRepo: ResultRepository;
  let tracker: FatigueTracker;

  beforeEach(() => {
    db = getTestDb();
    seedAthlete(db);
    seedWorkout(db);
    resultRepo = new ResultRepository(db);
    tracker = new FatigueTracker(db);
  });

  it("returns minimal report when no data", () => {
    const report = tracker.analyze("athlete_1");
    expect(report.rpeTrend).toHaveLength(0);
    expect(report.weeklyRpeAvg).toBeNull();
    expect(report.monthlyRpeAvg).toBeNull();
    expect(report.recentWorkoutCount).toBe(0);
    expect(report.loadTrend).toBe("insufficient_data");
    db.close();
  });

  it("computes weekly and monthly RPE averages", () => {
    // 4 workouts in last week with RPE
    for (let i = 0; i < 4; i++) {
      resultRepo.save(
        makeResult({
          id: `r_${i}`,
          performedAt: new Date(Date.now() - i * 86400000).toISOString(),
          rpe: 7 + i * 0.5, // 7, 7.5, 8, 8.5
          movementResults: [],
        })
      );
    }

    const report = tracker.analyze("athlete_1");
    expect(report.weeklyRpeAvg).not.toBeNull();
    expect(report.monthlyRpeAvg).not.toBeNull();
    expect(report.recentWorkoutCount).toBe(4);
    db.close();
  });

  it("builds RPE trend from results", () => {
    for (let i = 0; i < 5; i++) {
      resultRepo.save(
        makeResult({
          id: `r_${i}`,
          performedAt: new Date(Date.now() - (4 - i) * 86400000).toISOString(),
          rpe: 6 + i,
          movementResults: [],
        })
      );
    }

    const report = tracker.analyze("athlete_1");
    expect(report.rpeTrend).toHaveLength(5);
    // Should be ordered oldest first
    expect(report.rpeTrend[0].rpe).toBeLessThanOrEqual(
      report.rpeTrend[report.rpeTrend.length - 1].rpe
    );
    db.close();
  });

  it("detects high RPE warning when all recent workouts are 9+", () => {
    for (let i = 0; i < 6; i++) {
      resultRepo.save(
        makeResult({
          id: `r_${i}`,
          performedAt: new Date(Date.now() - i * 86400000).toISOString(),
          rpe: 9.5,
          movementResults: [],
        })
      );
    }

    const report = tracker.analyze("athlete_1");
    const rpeInsights = report.insights.filter(
      (i) => i.category === "rpe_trend" || i.category === "rpe_acute"
    );
    expect(rpeInsights.length).toBeGreaterThanOrEqual(1);
    expect(rpeInsights.some((i) => i.severity === "warning")).toBe(true);
    db.close();
  });

  it("detects consecutive high-intensity days", () => {
    // 4 consecutive days, all RPE 9
    for (let i = 0; i < 4; i++) {
      resultRepo.save(
        makeResult({
          id: `r_${i}`,
          performedAt: new Date(Date.now() - i * 86400000).toISOString(),
          rpe: 9,
          movementResults: [],
        })
      );
    }

    const report = tracker.analyze("athlete_1");
    const recoveryInsights = report.insights.filter(
      (i) => i.category === "recovery"
    );
    expect(recoveryInsights.length).toBeGreaterThanOrEqual(1);
    db.close();
  });

  it("detects training spike (overreaching)", () => {
    // 6 workouts this week, but only 2 per week in the prior 3 weeks
    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      resultRepo.save(
        makeResult({
          id: `recent_${i}`,
          performedAt: new Date(now - i * 86400000).toISOString(),
          rpe: 7,
          movementResults: [],
        })
      );
    }
    // 6 workouts spread over 3 weeks before that
    for (let i = 0; i < 6; i++) {
      resultRepo.save(
        makeResult({
          id: `old_${i}`,
          performedAt: new Date(now - (8 + i * 3) * 86400000).toISOString(),
          rpe: 7,
          movementResults: [],
        })
      );
    }

    const report = tracker.analyze("athlete_1");
    const overreachInsights = report.insights.filter(
      (i) => i.category === "overreaching"
    );
    expect(overreachInsights.length).toBeGreaterThanOrEqual(1);
    db.close();
  });

  it("detects increasing load trend", () => {
    // 8 workouts: first 4 at RPE 5-6, last 4 at RPE 8-9
    for (let i = 0; i < 8; i++) {
      resultRepo.save(
        makeResult({
          id: `r_${i}`,
          performedAt: new Date(
            Date.now() - (7 - i) * 3 * 86400000
          ).toISOString(),
          rpe: i < 4 ? 5 + i * 0.25 : 8 + (i - 4) * 0.25,
          movementResults: [],
        })
      );
    }

    const report = tracker.analyze("athlete_1");
    expect(report.loadTrend).toBe("increasing");
    db.close();
  });

  it("detects decreasing load trend", () => {
    for (let i = 0; i < 8; i++) {
      resultRepo.save(
        makeResult({
          id: `r_${i}`,
          performedAt: new Date(
            Date.now() - (7 - i) * 3 * 86400000
          ).toISOString(),
          rpe: i < 4 ? 9 - i * 0.25 : 5 - (i - 4) * 0.25,
          movementResults: [],
        })
      );
    }

    const report = tracker.analyze("athlete_1");
    expect(report.loadTrend).toBe("decreasing");
    db.close();
  });
});
