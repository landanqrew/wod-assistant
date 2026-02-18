import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { getTestDb } from "./connection.js";
import { ResultRepository } from "./result-repository.js";
import { PRRepository } from "./pr-repository.js";
import type { WorkoutResult } from "../models/workout-result.js";
import { ScoreType } from "../models/workout.js";

function seedAthlete(db: Database.Database, id = "athlete_1"): void {
  db.prepare(
    "INSERT INTO athletes (id, name, sex) VALUES (?, ?, ?)"
  ).run(id, "Test Athlete", "male");
}

function seedWorkout(db: Database.Database, id = "wod_1"): void {
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
    performedAt: "2026-02-10T10:00:00Z",
    scoreType: ScoreType.RoundsAndReps,
    rx: true,
    movementResults: [],
    ...overrides,
  };
}

describe("Database connection", () => {
  it("creates tables via migrations", () => {
    const db = getTestDb();
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all() as any[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("athletes");
    expect(names).toContain("workouts");
    expect(names).toContain("workout_results");
    expect(names).toContain("personal_records");
    expect(names).toContain("schema_version");
    db.close();
  });

  it("tracks schema version", () => {
    const db = getTestDb();
    const row = db
      .prepare("SELECT MAX(version) AS v FROM schema_version")
      .get() as any;
    expect(row.v).toBe(1);
    db.close();
  });
});

describe("ResultRepository", () => {
  let db: Database.Database;
  let repo: ResultRepository;

  beforeEach(() => {
    db = getTestDb();
    seedAthlete(db);
    seedWorkout(db);
    repo = new ResultRepository(db);
  });

  it("saves and retrieves a result", () => {
    const result = makeResult({
      roundsCompleted: 8,
      partialReps: 5,
      rpe: 7,
    });
    repo.save(result);

    const fetched = repo.getById(result.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.athleteId).toBe("athlete_1");
    expect(fetched!.roundsCompleted).toBe(8);
    expect(fetched!.partialReps).toBe(5);
    expect(fetched!.rpe).toBe(7);
    expect(fetched!.rx).toBe(true);
    db.close();
  });

  it("returns null for non-existent result", () => {
    expect(repo.getById("nonexistent")).toBeNull();
    db.close();
  });

  it("lists results by athlete", () => {
    repo.save(makeResult({ id: "r1", performedAt: "2026-02-10T10:00:00Z" }));
    repo.save(makeResult({ id: "r2", performedAt: "2026-02-11T10:00:00Z" }));
    repo.save(makeResult({ id: "r3", performedAt: "2026-02-12T10:00:00Z" }));

    const results = repo.getByAthlete("athlete_1");
    expect(results).toHaveLength(3);
    // Most recent first
    expect(results[0].id).toBe("r3");
    db.close();
  });

  it("filters by date range", () => {
    repo.save(makeResult({ id: "r1", performedAt: "2026-02-01T10:00:00Z" }));
    repo.save(makeResult({ id: "r2", performedAt: "2026-02-10T10:00:00Z" }));
    repo.save(makeResult({ id: "r3", performedAt: "2026-02-20T10:00:00Z" }));

    const results = repo.getByDateRange(
      "athlete_1",
      "2026-02-05T00:00:00Z",
      "2026-02-15T00:00:00Z"
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("r2");
    db.close();
  });

  it("filters by athlete and workout", () => {
    seedWorkout(db, "wod_2");
    repo.save(makeResult({ id: "r1", workoutId: "wod_1" }));
    repo.save(makeResult({ id: "r2", workoutId: "wod_2" }));
    repo.save(makeResult({ id: "r3", workoutId: "wod_1" }));

    const results = repo.getByAthleteAndWorkout("athlete_1", "wod_1");
    expect(results).toHaveLength(2);
    db.close();
  });

  it("counts results for athlete", () => {
    repo.save(makeResult({ id: "r1" }));
    repo.save(makeResult({ id: "r2" }));
    expect(repo.countByAthlete("athlete_1")).toBe(2);
    db.close();
  });

  it("deletes a result", () => {
    const result = makeResult();
    repo.save(result);
    expect(repo.delete(result.id)).toBe(true);
    expect(repo.getById(result.id)).toBeNull();
    db.close();
  });

  it("serializes and deserializes movement results", () => {
    const result = makeResult({
      movementResults: [
        { movementId: "back_squat", load: 225, reps: 10, rx: true },
        { movementId: "pull_up", reps: 15, rx: true },
      ],
    });
    repo.save(result);

    const fetched = repo.getById(result.id)!;
    expect(fetched.movementResults).toHaveLength(2);
    expect(fetched.movementResults[0].movementId).toBe("back_squat");
    expect(fetched.movementResults[0].load).toBe(225);
    expect(fetched.movementResults[1].movementId).toBe("pull_up");
    db.close();
  });
});

describe("PRRepository", () => {
  let db: Database.Database;
  let repo: PRRepository;

  beforeEach(() => {
    db = getTestDb();
    seedAthlete(db);
    seedWorkout(db);
    repo = new PRRepository(db);
  });

  it("saves and retrieves a PR", () => {
    repo.save({
      id: "pr_1",
      athleteId: "athlete_1",
      referenceId: "back_squat",
      referenceType: "movement",
      category: "1rm",
      value: 315,
      unit: "lbs",
      achievedAt: "2026-02-10T10:00:00Z",
    });

    const pr = repo.getCurrentPR("athlete_1", "back_squat", "1rm");
    expect(pr).not.toBeNull();
    expect(pr!.value).toBe(315);
    db.close();
  });

  it("returns the highest value for getCurrentPR", () => {
    repo.save({
      id: "pr_1", athleteId: "athlete_1", referenceId: "back_squat",
      referenceType: "movement", category: "1rm", value: 275,
      unit: "lbs", achievedAt: "2026-01-01T10:00:00Z",
    });
    repo.save({
      id: "pr_2", athleteId: "athlete_1", referenceId: "back_squat",
      referenceType: "movement", category: "1rm", value: 315,
      unit: "lbs", achievedAt: "2026-02-01T10:00:00Z",
    });

    const pr = repo.getCurrentPR("athlete_1", "back_squat", "1rm");
    expect(pr!.value).toBe(315);
    db.close();
  });

  it("returns the lowest value for getCurrentTimePR", () => {
    // Seed workout results for FK
    const resultRepo = new ResultRepository(db);
    resultRepo.save(makeResult({ id: "wr_1" }));
    resultRepo.save(makeResult({ id: "wr_2" }));

    repo.save({
      id: "pr_1", athleteId: "athlete_1", referenceId: "wod_1",
      referenceType: "workout", category: "fastest_time", value: 480,
      unit: "seconds", achievedAt: "2026-01-01T10:00:00Z",
      workoutResultId: "wr_1",
    });
    repo.save({
      id: "pr_2", athleteId: "athlete_1", referenceId: "wod_1",
      referenceType: "workout", category: "fastest_time", value: 420,
      unit: "seconds", achievedAt: "2026-02-01T10:00:00Z",
      workoutResultId: "wr_2",
    });

    const pr = repo.getCurrentTimePR("athlete_1", "wod_1", "fastest_time");
    expect(pr!.value).toBe(420);
    db.close();
  });

  it("lists all PRs for athlete", () => {
    repo.save({
      id: "pr_1", athleteId: "athlete_1", referenceId: "back_squat",
      referenceType: "movement", category: "1rm", value: 315,
      unit: "lbs", achievedAt: "2026-02-10T10:00:00Z",
    });
    repo.save({
      id: "pr_2", athleteId: "athlete_1", referenceId: "deadlift",
      referenceType: "movement", category: "1rm", value: 405,
      unit: "lbs", achievedAt: "2026-02-11T10:00:00Z",
    });

    const prs = repo.getAllForAthlete("athlete_1");
    expect(prs).toHaveLength(2);
    db.close();
  });
});
