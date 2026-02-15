import { describe, it, expect } from "vitest";
import {
  getAllMovements,
  getMovement,
  getMovementOrThrow,
  getMovementsByModality,
  getMovementsByMuscleGroup,
  getMovementsByEquipment,
} from "./library.js";
import { Modality, MuscleGroup } from "../models/body.js";
import { Equipment } from "../models/equipment.js";

describe("movement library", () => {
  it("has a reasonable number of movements", () => {
    const all = getAllMovements();
    expect(all.length).toBeGreaterThanOrEqual(50);
  });

  it("has no duplicate IDs", () => {
    const all = getAllMovements();
    const ids = all.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("every movement has at least one primary region", () => {
    for (const m of getAllMovements()) {
      expect(m.primaryRegions.length).toBeGreaterThan(0);
    }
  });

  it("every movement has at least one muscle group", () => {
    for (const m of getAllMovements()) {
      expect(m.muscleGroups.length).toBeGreaterThan(0);
    }
  });

  it("every substitution reference points to a valid movement", () => {
    const all = getAllMovements();
    const ids = new Set(all.map((m) => m.id));
    for (const m of all) {
      for (const subId of m.substitutions) {
        expect(ids.has(subId)).toBe(true);
      }
    }
  });

  it("looks up movements by ID", () => {
    expect(getMovement("air_squat")?.name).toBe("Air Squat");
    expect(getMovement("nonexistent")).toBeUndefined();
  });

  it("throws for missing movement with getMovementOrThrow", () => {
    expect(() => getMovementOrThrow("nonexistent")).toThrow();
  });

  it("filters by modality", () => {
    const gymnastics = getMovementsByModality(Modality.Gymnastics);
    expect(gymnastics.length).toBeGreaterThan(0);
    for (const m of gymnastics) {
      expect(m.modality).toBe(Modality.Gymnastics);
    }
  });

  it("filters by muscle group", () => {
    const pushMovements = getMovementsByMuscleGroup(MuscleGroup.Push);
    expect(pushMovements.length).toBeGreaterThan(0);
    for (const m of pushMovements) {
      expect(m.muscleGroups).toContain(MuscleGroup.Push);
    }
  });

  it("filters by equipment", () => {
    const dbOnly = getMovementsByEquipment([Equipment.Dumbbell]);
    expect(dbOnly.length).toBeGreaterThan(0);
    for (const m of dbOnly) {
      expect(
        m.equipment.every(
          (e) => e === Equipment.None || e === Equipment.Dumbbell
        )
      ).toBe(true);
    }
  });

  it("covers all four modalities", () => {
    for (const modality of Object.values(Modality)) {
      const movements = getMovementsByModality(modality);
      expect(movements.length).toBeGreaterThan(0);
    }
  });
});
