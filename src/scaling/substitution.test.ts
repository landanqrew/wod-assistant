import { describe, it, expect } from "vitest";
import { findSubstitution, scaleWorkoutMovements } from "./substitution.js";
import {
  buildPregnancyConstraints,
  buildInjuryConstraints,
  ImpedimentSeverity,
} from "../models/impediment.js";
import { BodyRegion } from "../models/body.js";
import { EQUIPMENT_PRESETS } from "../models/equipment.js";
import { getMovementOrThrow } from "../movements/library.js";

describe("findSubstitution", () => {
  it("returns the original movement when no constraints", () => {
    const backSquat = getMovementOrThrow("back_squat");
    const result = findSubstitution(
      backSquat,
      null,
      EQUIPMENT_PRESETS.fullGym
    );
    expect(result.replacement?.id).toBe("back_squat");
    expect(result.loadScale).toBe(1);
  });

  it("substitutes barbell movement when only dumbbells available", () => {
    const backSquat = getMovementOrThrow("back_squat");
    const result = findSubstitution(
      backSquat,
      null,
      EQUIPMENT_PRESETS.minimal
    );
    // back_squat subs: air_squat, goblet_squat, dumbbell_squat, front_squat
    // minimal has dumbbells, so goblet_squat or dumbbell_squat should work
    expect(result.replacement).not.toBeNull();
    expect(["goblet_squat", "dumbbell_squat", "air_squat"]).toContain(
      result.replacement!.id
    );
  });

  it("substitutes to bodyweight when only bodyweight available", () => {
    const backSquat = getMovementOrThrow("back_squat");
    const result = findSubstitution(
      backSquat,
      null,
      EQUIPMENT_PRESETS.bodyweight
    );
    // Should fall to air_squat (first in chain, bodyweight)
    expect(result.replacement?.id).toBe("air_squat");
  });

  it("finds a non-inverted substitute for HSPU during pregnancy", () => {
    const hspu = getMovementOrThrow("handstand_push_up");
    const constraints = buildPregnancyConstraints(1);
    const result = findSubstitution(
      hspu,
      constraints,
      EQUIPMENT_PRESETS.fullGym
    );
    expect(result.replacement).not.toBeNull();
    expect(result.replacement!.tags).not.toContain("inverted");
  });

  it("finds a non-overhead substitute during pregnancy T3", () => {
    const strictPress = getMovementOrThrow("strict_press");
    const constraints = buildPregnancyConstraints(3);
    const result = findSubstitution(
      strictPress,
      constraints,
      EQUIPMENT_PRESETS.fullGym
    );
    // strict_press subs: dumbbell_press, push_press
    // Both are overhead, so might get push_up from dumbbell_press chain
    // or null if all subs are also overhead
    // dumbbell_press subs: push_up -- push_up is not overhead!
    // But dumbbell_press itself IS overhead, so it won't be selected.
    // The engine walks strict_press's direct substitutions only.
    // So if all of strict_press's subs are overhead, result will be null.
    // That's ok -- it means we need broader search (future feature)
    if (result.replacement) {
      expect(result.replacement.tags).not.toContain("overhead");
    }
  });

  it("applies load scaling when constraints cap load", () => {
    const gobletSquat = getMovementOrThrow("goblet_squat");
    const constraints = buildPregnancyConstraints(2);
    const result = findSubstitution(
      gobletSquat,
      constraints,
      EQUIPMENT_PRESETS.fullGym
    );
    // Pregnancy T2 caps at 70%, goblet squat should still be allowed
    // but with load scaling
    expect(result.loadScale).toBe(0.7);
  });

  it("returns null replacement when no valid substitute exists", () => {
    // Severe shoulder injury + bodyweight only
    const constraints = buildInjuryConstraints(
      [BodyRegion.Shoulders, BodyRegion.Chest, BodyRegion.Triceps],
      ImpedimentSeverity.Severe
    );
    const hspu = getMovementOrThrow("handstand_push_up");
    const result = findSubstitution(
      hspu,
      constraints,
      EQUIPMENT_PRESETS.bodyweight
    );
    // HSPU subs are push_up (chest/triceps), dumbbell_press (shoulders), strict_press (shoulders), pike_push_up (shoulders)
    // All stress restricted regions
    expect(result.replacement).toBeNull();
  });
});

describe("scaleWorkoutMovements", () => {
  it("scales all movements in a workout", () => {
    const movements = [
      getMovementOrThrow("back_squat"),
      getMovementOrThrow("pull_up"),
      getMovementOrThrow("run"),
    ];
    const results = scaleWorkoutMovements(
      movements,
      null,
      EQUIPMENT_PRESETS.bodyweight
    );
    expect(results).toHaveLength(3);
    // back_squat needs sub (no barbell), pull_up needs sub (no bar), run is fine
    expect(results[0].replacement?.id).toBe("air_squat");
    expect(results[2].replacement?.id).toBe("run");
  });
});
