import { describe, it, expect } from "vitest";
import {
  scaleWorkoutToTier,
  generateAllScalingTiers,
} from "./scaling-tiers.js";
import { EQUIPMENT_PRESETS } from "../models/equipment.js";
import { DifficultyTier } from "../models/movement.js";
import { WorkoutFormat, ScoreType } from "../models/workout.js";
import type { Workout } from "../models/workout.js";
import { getMovementOrThrow } from "../movements/library.js";

function makeTestWorkout(): Workout {
  const backSquat = getMovementOrThrow("back_squat");
  const pullUp = getMovementOrThrow("pull_up");
  const run = getMovementOrThrow("run");

  return {
    id: "test_wod_1",
    name: "Test AMRAP",
    format: WorkoutFormat.AMRAP,
    movements: [
      { movementId: "back_squat", movement: backSquat, reps: 10, load: 225 },
      { movementId: "pull_up", movement: pullUp, reps: 15 },
      { movementId: "run", movement: run, distance: 400 },
    ],
    timeCap: 12,
    scoreType: ScoreType.RoundsAndReps,
    isBenchmark: false,
  };
}

describe("scaleWorkoutToTier", () => {
  it("keeps movements and loads at Rx tier", () => {
    const workout = makeTestWorkout();
    const scaled = scaleWorkoutToTier(
      workout,
      DifficultyTier.Rx,
      EQUIPMENT_PRESETS.fullGym
    );

    expect(scaled.tier).toBe(DifficultyTier.Rx);
    // Back squat is intermediate difficulty, below Rx -- kept as-is
    expect(scaled.workout.movements[0].movementId).toBe("back_squat");
    expect(scaled.workout.movements[0].load).toBe(225);
    expect(scaled.workout.movements[0].reps).toBe(10);
  });

  it("scales loads and reps down for beginner tier", () => {
    const workout = makeTestWorkout();
    const scaled = scaleWorkoutToTier(
      workout,
      DifficultyTier.Beginner,
      EQUIPMENT_PRESETS.fullGym
    );

    expect(scaled.tier).toBe(DifficultyTier.Beginner);
    // Load should be ~45% of 225 = ~101
    const squat = scaled.workout.movements[0];
    expect(squat.load).toBe(Math.round(225 * 0.45));
    // Reps should be ~60% of 10 = 6
    expect(squat.reps).toBe(Math.round(10 * 0.6));
  });

  it("substitutes advanced movements for beginner tier", () => {
    const musclUpBar = getMovementOrThrow("muscle_up_bar");
    const workout: Workout = {
      id: "test_advanced",
      name: "Advanced WOD",
      format: WorkoutFormat.ForTime,
      movements: [
        { movementId: "muscle_up_bar", movement: musclUpBar, reps: 5 },
      ],
      timeCap: 10,
      scoreType: ScoreType.Time,
      isBenchmark: false,
    };

    const scaled = scaleWorkoutToTier(
      workout,
      DifficultyTier.Beginner,
      EQUIPMENT_PRESETS.fullGym
    );

    // muscle_up_bar is Rx+ difficulty -- should be swapped for a beginner pull movement
    const replacement = scaled.workout.movements[0];
    expect(replacement.movementId).not.toBe("muscle_up_bar");
    // Should be a beginner-level pull movement
    const mov = replacement.movement!;
    expect(
      mov.difficulty === DifficultyTier.Beginner ||
      mov.difficulty === DifficultyTier.Intermediate
    ).toBe(true);
  });

  it("passes through distance/calories/duration unchanged", () => {
    const workout = makeTestWorkout();
    const scaled = scaleWorkoutToTier(
      workout,
      DifficultyTier.Beginner,
      EQUIPMENT_PRESETS.fullGym
    );

    // Run distance should not change
    const runPrescription = scaled.workout.movements[2];
    expect(runPrescription.distance).toBe(400);
  });

  it("appends tier label to workout name", () => {
    const workout = makeTestWorkout();
    const scaled = scaleWorkoutToTier(
      workout,
      DifficultyTier.Intermediate,
      EQUIPMENT_PRESETS.fullGym
    );
    expect(scaled.workout.name).toContain("Intermediate");
  });

  it("provides scaling notes for each movement", () => {
    const workout = makeTestWorkout();
    const scaled = scaleWorkoutToTier(
      workout,
      DifficultyTier.Beginner,
      EQUIPMENT_PRESETS.fullGym
    );

    expect(scaled.scalingNotes).toHaveLength(3);
    expect(scaled.scalingNotes[0].originalId).toBe("back_squat");
    expect(scaled.scalingNotes[0].changes.length).toBeGreaterThan(0);
  });

  it("scales loads up for Rx+ tier", () => {
    const workout = makeTestWorkout();
    const scaled = scaleWorkoutToTier(
      workout,
      DifficultyTier.RxPlus,
      EQUIPMENT_PRESETS.fullGym
    );

    // Load should be 110% of 225 = ~248
    expect(scaled.workout.movements[0].load).toBe(Math.round(225 * 1.1));
    // Reps should be 120% of 10 = 12
    expect(scaled.workout.movements[0].reps).toBe(Math.round(10 * 1.2));
  });
});

describe("generateAllScalingTiers", () => {
  it("generates 5 tiers", () => {
    const workout = makeTestWorkout();
    const tiers = generateAllScalingTiers(workout, EQUIPMENT_PRESETS.fullGym);

    expect(tiers).toHaveLength(5);
    expect(tiers.map((t) => t.tier)).toEqual([
      DifficultyTier.Beginner,
      DifficultyTier.Intermediate,
      DifficultyTier.Advanced,
      DifficultyTier.Rx,
      DifficultyTier.RxPlus,
    ]);
  });

  it("has increasing loads across tiers for weighted movements", () => {
    const workout = makeTestWorkout();
    const tiers = generateAllScalingTiers(workout, EQUIPMENT_PRESETS.fullGym);

    const loads = tiers.map((t) => t.workout.movements[0].load!);
    for (let i = 1; i < loads.length; i++) {
      expect(loads[i]).toBeGreaterThanOrEqual(loads[i - 1]);
    }
  });
});
