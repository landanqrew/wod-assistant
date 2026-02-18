import { describe, it, expect } from "vitest";
import { generateWarmUp, generateCoolDown } from "./warmup-engine.js";
import { getBenchmark } from "./benchmark-library.js";
import type { Workout } from "../models/workout.js";
import { WorkoutFormat, ScoreType } from "../models/workout.js";
import { getMovement } from "../movements/library.js";

function makeWorkout(movementIds: string[], format = WorkoutFormat.AMRAP): Workout {
  return {
    id: "test_workout",
    name: "Test",
    format,
    movements: movementIds.map((id) => ({
      movementId: id,
      movement: getMovement(id),
      reps: 10,
    })),
    scoreType: ScoreType.RoundsAndReps,
    isBenchmark: false,
    timeCap: 12,
  };
}

describe("generateWarmUp", () => {
  it("always includes general warm-up drills", () => {
    const workout = makeWorkout(["air_squat", "push_up"]);
    const drills = generateWarmUp(workout);

    expect(drills.length).toBeGreaterThan(0);
    expect(drills[0].name).toBe("Easy Jog / Row");
    expect(drills[1].name).toBe("Jumping Jacks");
  });

  it("includes shoulder-specific drills for overhead movements", () => {
    const workout = makeWorkout(["strict_press", "push_jerk"]);
    const drills = generateWarmUp(workout);

    const drillNames = drills.map((d) => d.name);
    // Should include at least one shoulder drill
    const shoulderDrills = ["Arm Circles", "PVC Pass-throughs", "Band Pull-Aparts"];
    expect(drillNames.some((n) => shoulderDrills.includes(n))).toBe(true);
  });

  it("includes hip/squat drills for squat-heavy workouts", () => {
    const workout = makeWorkout(["back_squat", "front_squat"]);
    const drills = generateWarmUp(workout);

    const drillNames = drills.map((d) => d.name);
    // Should include quad or glute drill
    const legDrills = ["Bodyweight Squats", "Walking Quad Stretch", "Glute Bridges"];
    expect(drillNames.some((n) => legDrills.includes(n))).toBe(true);
  });

  it("includes barbell complex for weightlifting workouts", () => {
    const workout = makeWorkout(["clean", "snatch"]);
    const drills = generateWarmUp(workout);

    const drillNames = drills.map((d) => d.name);
    expect(drillNames).toContain("Empty Barbell Complex");
  });

  it("generates warm-up for Fran benchmark", () => {
    const fran = getBenchmark("fran")!;
    const drills = generateWarmUp(fran);

    // Fran has thrusters (shoulders, quads, glutes) and pull-ups (lats, biceps)
    expect(drills.length).toBeGreaterThan(3);
  });

  it("does not duplicate drill names", () => {
    const workout = makeWorkout(["back_squat", "front_squat", "deadlift", "clean"]);
    const drills = generateWarmUp(workout);

    const names = drills.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("generateCoolDown", () => {
  it("always starts with easy walk/row", () => {
    const workout = makeWorkout(["air_squat"]);
    const drills = generateCoolDown(workout);

    expect(drills[0].name).toBe("Easy Walk / Slow Row");
  });

  it("returns at least 4 drills", () => {
    const workout = makeWorkout(["air_squat"]);
    const drills = generateCoolDown(workout);

    expect(drills.length).toBeGreaterThanOrEqual(4);
  });

  it("includes relevant stretches for lower body workout", () => {
    const workout = makeWorkout(["back_squat", "deadlift"]);
    const drills = generateCoolDown(workout);

    const drillNames = drills.map((d) => d.name);
    // Should include hamstring or quad stretches
    expect(
      drillNames.some(
        (n) =>
          n.includes("Forward Fold") ||
          n.includes("Couch Stretch") ||
          n.includes("Pigeon")
      )
    ).toBe(true);
  });

  it("includes shoulder stretches for pressing workout", () => {
    const workout = makeWorkout(["strict_press", "push_press"]);
    const drills = generateCoolDown(workout);

    const drillNames = drills.map((d) => d.name);
    expect(
      drillNames.some(
        (n) =>
          n.includes("Shoulder Stretch") ||
          n.includes("Chest Stretch") ||
          n.includes("Child's Pose")
      )
    ).toBe(true);
  });
});
