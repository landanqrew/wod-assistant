import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { getTestDb } from "./connection.js";
import { AthleteRepository } from "./athlete-repository.js";
import { WorkoutRepository } from "./workout-repository.js";
import { Sex, createAthlete } from "../models/athlete.js";
import { Equipment } from "../models/equipment.js";
import type { Workout } from "../models/workout.js";
import { WorkoutFormat, ScoreType } from "../models/workout.js";

// ─── AthleteRepository ───────────────────────────────────────────

describe("AthleteRepository", () => {
  let db: Database.Database;
  let repo: AthleteRepository;

  beforeEach(() => {
    db = getTestDb();
    repo = new AthleteRepository(db);
  });

  it("saves and retrieves an athlete", () => {
    const a = createAthlete("alice", "Alice", Sex.Female, [
      Equipment.Barbell,
      Equipment.Plates,
    ]);
    repo.save(a);

    const fetched = repo.getById("alice");
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("Alice");
    expect(fetched!.sex).toBe(Sex.Female);
    expect(fetched!.equipment.has(Equipment.Barbell)).toBe(true);
    expect(fetched!.equipment.has(Equipment.Plates)).toBe(true);
    db.close();
  });

  it("returns null for non-existent athlete", () => {
    expect(repo.getById("nobody")).toBeNull();
    db.close();
  });

  it("upserts on save", () => {
    const a = createAthlete("bob", "Bob", Sex.Male);
    repo.save(a);
    expect(repo.getById("bob")!.name).toBe("Bob");

    a.name = "Robert";
    repo.save(a);
    expect(repo.getById("bob")!.name).toBe("Robert");

    // Should still be just one athlete
    expect(repo.getAll()).toHaveLength(1);
    db.close();
  });

  it("returns default (first created) athlete", () => {
    const a1 = createAthlete("first", "First", Sex.Male);
    const a2 = createAthlete("second", "Second", Sex.Female);
    repo.save(a1);
    repo.save(a2);

    const def = repo.getDefault();
    expect(def).not.toBeNull();
    expect(def!.id).toBe("first");
    db.close();
  });

  it("returns null for default when empty", () => {
    expect(repo.getDefault()).toBeNull();
    db.close();
  });

  it("lists all athletes", () => {
    repo.save(createAthlete("a", "A", Sex.Male));
    repo.save(createAthlete("b", "B", Sex.Female));
    expect(repo.getAll()).toHaveLength(2);
    db.close();
  });

  it("deletes an athlete", () => {
    repo.save(createAthlete("del", "Delete Me", Sex.Male));
    expect(repo.delete("del")).toBe(true);
    expect(repo.getById("del")).toBeNull();
    db.close();
  });

  it("returns false when deleting non-existent athlete", () => {
    expect(repo.delete("nope")).toBe(false);
    db.close();
  });

  it("persists preferred duration and framework", () => {
    const a = createAthlete("cfg", "Config", Sex.Male);
    a.preferredDuration = 30;
    a.framework = "crossfit";
    repo.save(a);

    const fetched = repo.getById("cfg")!;
    expect(fetched.preferredDuration).toBe(30);
    expect(fetched.framework).toBe("crossfit");
    db.close();
  });
});

// ─── WorkoutRepository ───────────────────────────────────────────

describe("WorkoutRepository", () => {
  let db: Database.Database;
  let repo: WorkoutRepository;

  function makeWorkout(overrides: Partial<Workout> = {}): Workout {
    return {
      id: `wod_${Math.random().toString(36).slice(2, 8)}`,
      name: "Test AMRAP",
      format: WorkoutFormat.AMRAP,
      movements: [
        { movementId: "back_squat", reps: 10, load: 135 },
        { movementId: "pull_up", reps: 15 },
      ],
      timeCap: 12,
      scoreType: ScoreType.RoundsAndReps,
      isBenchmark: false,
      estimatedDuration: 12,
      ...overrides,
    };
  }

  beforeEach(() => {
    db = getTestDb();
    repo = new WorkoutRepository(db);
  });

  it("saves and retrieves a workout", () => {
    const w = makeWorkout({ id: "wod_1" });
    repo.save(w);

    const fetched = repo.getById("wod_1");
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("Test AMRAP");
    expect(fetched!.format).toBe(WorkoutFormat.AMRAP);
    expect(fetched!.movements).toHaveLength(2);
    expect(fetched!.movements[0].movementId).toBe("back_squat");
    expect(fetched!.movements[0].load).toBe(135);
    expect(fetched!.movements[1].movementId).toBe("pull_up");
    expect(fetched!.timeCap).toBe(12);
    expect(fetched!.scoreType).toBe(ScoreType.RoundsAndReps);
    expect(fetched!.isBenchmark).toBe(false);
    db.close();
  });

  it("returns null for non-existent workout", () => {
    expect(repo.getById("nope")).toBeNull();
    db.close();
  });

  it("gets recent workouts in order", () => {
    repo.save(makeWorkout({ id: "w1", name: "First" }));
    repo.save(makeWorkout({ id: "w2", name: "Second" }));
    repo.save(makeWorkout({ id: "w3", name: "Third" }));

    const recent = repo.getRecent(2);
    expect(recent).toHaveLength(2);
    // Most recent first
    expect(recent[0].id).toBe("w3");
    expect(recent[1].id).toBe("w2");
    db.close();
  });

  it("gets benchmark workouts", () => {
    repo.save(makeWorkout({ id: "w1", isBenchmark: false }));
    repo.save(makeWorkout({ id: "w2", name: "Fran", isBenchmark: true }));
    repo.save(makeWorkout({ id: "w3", name: "Grace", isBenchmark: true }));

    const benchmarks = repo.getBenchmarks();
    expect(benchmarks).toHaveLength(2);
    // Sorted by name
    expect(benchmarks[0].name).toBe("Fran");
    expect(benchmarks[1].name).toBe("Grace");
    db.close();
  });

  it("deletes a workout", () => {
    const w = makeWorkout();
    repo.save(w);
    expect(repo.delete(w.id)).toBe(true);
    expect(repo.getById(w.id)).toBeNull();
    db.close();
  });

  it("handles all workout fields", () => {
    const w = makeWorkout({
      id: "full",
      rounds: 5,
      workInterval: 60,
      restInterval: 30,
      emomMinutes: 20,
      description: "A full workout",
    });
    repo.save(w);

    const fetched = repo.getById("full")!;
    expect(fetched.rounds).toBe(5);
    expect(fetched.workInterval).toBe(60);
    expect(fetched.restInterval).toBe(30);
    expect(fetched.emomMinutes).toBe(20);
    expect(fetched.description).toBe("A full workout");
    db.close();
  });
});
