import { describe, it, expect, beforeEach } from "vitest";
import type Database_T from "better-sqlite3";
import { getTestDb } from "../db/connection.js";
import { ResultRepository } from "../db/result-repository.js";
import { PRTracker } from "./pr-tracker.js";
import { VolumeTracker } from "./volume-tracker.js";
import type { WorkoutResult } from "../models/workout-result.js";
import { ScoreType } from "../models/workout.js";

function seedAthlete(db: Database_T.Database, id = "athlete_1"): void {
  db.prepare(
    "INSERT INTO athletes (id, name, sex) VALUES (?, ?, ?)"
  ).run(id, "Test Athlete", "male");
}

function seedWorkout(
  db: Database_T.Database,
  id = "wod_1",
  scoreType = "rounds_and_reps"
): void {
  db.prepare(
    `INSERT INTO workouts (id, name, format, movements_json, score_type)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, "Test WOD", "amrap", "[]", scoreType);
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

describe("PRTracker", () => {
  let db: Database_T.Database;
  let resultRepo: ResultRepository;
  let tracker: PRTracker;

  beforeEach(() => {
    db = getTestDb();
    seedAthlete(db);
    seedWorkout(db);
    resultRepo = new ResultRepository(db);
    tracker = new PRTracker(db);
  });

  it("detects a new AMRAP PR", () => {
    const result = makeResult({
      roundsCompleted: 8,
      partialReps: 5,
    });
    resultRepo.save(result);

    const prs = tracker.detectAndSavePRs(result);
    expect(prs).toHaveLength(1);
    expect(prs[0].category).toBe("most_rounds");
    expect(prs[0].value).toBe(8005); // 8*1000 + 5
    expect(prs[0].referenceType).toBe("workout");
    db.close();
  });

  it("detects a faster time PR", () => {
    seedWorkout(db, "fran", "time");
    const first = makeResult({
      id: "r1",
      workoutId: "fran",
      scoreType: ScoreType.Time,
      timeSeconds: 300,
    });
    resultRepo.save(first);
    tracker.detectAndSavePRs(first);

    const second = makeResult({
      id: "r2",
      workoutId: "fran",
      scoreType: ScoreType.Time,
      timeSeconds: 240,
    });
    resultRepo.save(second);
    const prs = tracker.detectAndSavePRs(second);

    expect(prs).toHaveLength(1);
    expect(prs[0].category).toBe("fastest_time");
    expect(prs[0].value).toBe(240);
    expect(prs[0].previousValue).toBe(300);
    db.close();
  });

  it("does not create a PR when result is worse", () => {
    const first = makeResult({
      id: "r1",
      roundsCompleted: 10,
      partialReps: 0,
    });
    resultRepo.save(first);
    tracker.detectAndSavePRs(first);

    const second = makeResult({
      id: "r2",
      roundsCompleted: 8,
      partialReps: 0,
    });
    resultRepo.save(second);
    const prs = tracker.detectAndSavePRs(second);

    expect(prs).toHaveLength(0);
    db.close();
  });

  it("detects movement-level load PRs", () => {
    const result = makeResult({
      movementResults: [
        { movementId: "back_squat", load: 315, reps: 5, rx: true },
        { movementId: "pull_up", reps: 15, rx: true },
      ],
      roundsCompleted: 5,
    });
    resultRepo.save(result);

    const prs = tracker.detectAndSavePRs(result);
    // Should have 1 workout PR (rounds) + 1 movement PR (back_squat load)
    const movementPRs = prs.filter((p) => p.referenceType === "movement");
    expect(movementPRs).toHaveLength(1);
    expect(movementPRs[0].referenceId).toBe("back_squat");
    expect(movementPRs[0].value).toBe(315);
    db.close();
  });

  it("detects a strength load PR", () => {
    seedWorkout(db, "strength_1", "load");
    const result = makeResult({
      workoutId: "strength_1",
      scoreType: ScoreType.Load,
      peakLoad: 405,
      movementResults: [
        { movementId: "deadlift", load: 405, reps: 1, rx: true },
      ],
    });
    resultRepo.save(result);

    const prs = tracker.detectAndSavePRs(result);
    const workoutPRs = prs.filter((p) => p.referenceType === "workout");
    expect(workoutPRs).toHaveLength(1);
    expect(workoutPRs[0].category).toBe("heaviest_load");
    expect(workoutPRs[0].value).toBe(405);
    db.close();
  });

  it("returns all PRs for an athlete", () => {
    const r1 = makeResult({
      id: "r1",
      roundsCompleted: 10,
      movementResults: [
        { movementId: "back_squat", load: 225, reps: 10, rx: true },
      ],
    });
    resultRepo.save(r1);
    tracker.detectAndSavePRs(r1);

    const all = tracker.getAllPRs("athlete_1");
    expect(all.length).toBeGreaterThanOrEqual(1);
    db.close();
  });
});

describe("VolumeTracker", () => {
  let db: Database_T.Database;
  let resultRepo: ResultRepository;
  let volumeTracker: VolumeTracker;

  beforeEach(() => {
    db = getTestDb();
    seedAthlete(db);
    seedWorkout(db);
    resultRepo = new ResultRepository(db);
    volumeTracker = new VolumeTracker(db);
  });

  it("computes volume summary from results", () => {
    resultRepo.save(
      makeResult({
        id: "r1",
        performedAt: "2026-02-10T10:00:00Z",
        rpe: 7,
        movementResults: [
          { movementId: "back_squat", load: 225, reps: 10, rx: true },
          { movementId: "pull_up", reps: 15, rx: true },
        ],
      })
    );
    resultRepo.save(
      makeResult({
        id: "r2",
        performedAt: "2026-02-12T10:00:00Z",
        rpe: 8,
        rx: false,
        movementResults: [
          { movementId: "back_squat", load: 185, reps: 10, rx: false },
          { movementId: "run", reps: 0, rx: true },
        ],
      })
    );

    const summary = volumeTracker.summarize(
      "athlete_1",
      "2026-02-01T00:00:00Z",
      "2026-02-28T00:00:00Z"
    );

    expect(summary.totalWorkouts).toBe(2);
    expect(summary.rxWorkouts).toBe(1);
    // Volume: 225*10 + 185*10 = 4100
    expect(summary.totalVolumeLbs).toBe(4100);
    // Average RPE: (7+8)/2 = 7.5
    expect(summary.averageRpe).toBe(7.5);
    // Movement breakdown
    const squat = summary.movementBreakdown.find(
      (m) => m.movementId === "back_squat"
    );
    expect(squat).toBeDefined();
    expect(squat!.totalSets).toBe(2);
    expect(squat!.totalReps).toBe(20);
    expect(squat!.maxLoad).toBe(225);
    db.close();
  });

  it("returns empty summary when no results in range", () => {
    const summary = volumeTracker.summarize(
      "athlete_1",
      "2026-01-01T00:00:00Z",
      "2026-01-31T00:00:00Z"
    );
    expect(summary.totalWorkouts).toBe(0);
    expect(summary.totalVolumeLbs).toBe(0);
    expect(summary.averageRpe).toBeNull();
    expect(summary.movementBreakdown).toHaveLength(0);
    db.close();
  });

  it("tracks day-of-week distribution", () => {
    // Feb 10, 2026 is a Tuesday (day 2)
    resultRepo.save(
      makeResult({
        id: "r1",
        performedAt: "2026-02-10T10:00:00Z",
        movementResults: [],
      })
    );
    // Feb 11, 2026 is a Wednesday (day 3)
    resultRepo.save(
      makeResult({
        id: "r2",
        performedAt: "2026-02-11T10:00:00Z",
        movementResults: [],
      })
    );

    const summary = volumeTracker.summarize(
      "athlete_1",
      "2026-02-01T00:00:00Z",
      "2026-02-28T00:00:00Z"
    );

    expect(summary.dayDistribution[2]).toBe(1); // Tuesday
    expect(summary.dayDistribution[3]).toBe(1); // Wednesday
    expect(summary.dayDistribution[0]).toBe(0); // Sunday
    db.close();
  });

  it("sorts movement breakdown by total reps descending", () => {
    resultRepo.save(
      makeResult({
        id: "r1",
        performedAt: "2026-02-10T10:00:00Z",
        movementResults: [
          { movementId: "back_squat", load: 225, reps: 5, rx: true },
          { movementId: "pull_up", reps: 30, rx: true },
          { movementId: "run", reps: 1, rx: true },
        ],
      })
    );

    const summary = volumeTracker.summarize(
      "athlete_1",
      "2026-02-01T00:00:00Z",
      "2026-02-28T00:00:00Z"
    );

    expect(summary.movementBreakdown[0].movementId).toBe("pull_up");
    expect(summary.movementBreakdown[1].movementId).toBe("back_squat");
    db.close();
  });
});
