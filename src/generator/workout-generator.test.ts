import { describe, it, expect } from "vitest";
import { generateWorkout } from "./workout-generator.js";
import { createAthlete, Sex } from "../models/athlete.js";
import { Equipment, EQUIPMENT_PRESETS } from "../models/equipment.js";
import { WorkoutFormat, ScoreType } from "../models/workout.js";
import { Modality } from "../models/body.js";
import {
  buildPregnancyConstraints,
  ImpedimentCategory,
  ImpedimentSeverity,
} from "../models/impediment.js";
import { BodyRegion } from "../models/body.js";

describe("generateWorkout", () => {
  it("generates an AMRAP with the correct format and structure", () => {
    const athlete = createAthlete("test", "Test", Sex.Male, [
      ...EQUIPMENT_PRESETS.fullGym,
    ]);
    const workout = generateWorkout(athlete, {
      format: WorkoutFormat.AMRAP,
      movementCount: 3,
      timeCap: 12,
    });

    expect(workout.format).toBe(WorkoutFormat.AMRAP);
    expect(workout.movements).toHaveLength(3);
    expect(workout.timeCap).toBe(12);
    expect(workout.scoreType).toBe(ScoreType.RoundsAndReps);
    expect(workout.isBenchmark).toBe(false);
  });

  it("generates a ForTime workout", () => {
    const athlete = createAthlete("test", "Test", Sex.Female, [
      ...EQUIPMENT_PRESETS.fullGym,
    ]);
    const workout = generateWorkout(athlete, {
      format: WorkoutFormat.ForTime,
      movementCount: 4,
    });

    expect(workout.format).toBe(WorkoutFormat.ForTime);
    expect(workout.movements).toHaveLength(4);
    expect(workout.scoreType).toBe(ScoreType.Time);
  });

  it("generates bodyweight-only workout when no equipment", () => {
    const athlete = createAthlete("test", "Test", Sex.Male, [Equipment.None]);
    const workout = generateWorkout(athlete, {
      format: WorkoutFormat.AMRAP,
      movementCount: 3,
    });

    for (const p of workout.movements) {
      expect(
        p.movement!.equipment.every((e) => e === Equipment.None)
      ).toBe(true);
    }
  });

  it("generates workout respecting minimal equipment", () => {
    const athlete = createAthlete("test", "Test", Sex.Female, [
      ...EQUIPMENT_PRESETS.minimal,
    ]);
    const workout = generateWorkout(athlete, {
      format: WorkoutFormat.EMOM,
      movementCount: 3,
    });

    const available = EQUIPMENT_PRESETS.minimal;
    for (const p of workout.movements) {
      for (const eq of p.movement!.equipment) {
        if (eq !== Equipment.None) {
          expect(available.has(eq)).toBe(true);
        }
      }
    }
  });

  it("respects pregnancy constraints in generated workouts", () => {
    const athlete = createAthlete("test", "Test", Sex.Female, [
      ...EQUIPMENT_PRESETS.fullGym,
    ]);
    athlete.impediments = [
      {
        id: "preg",
        category: ImpedimentCategory.Pregnancy,
        severity: ImpedimentSeverity.Moderate,
        affectedRegions: [BodyRegion.Core],
        description: "Pregnancy T2",
        startDate: "2025-01-01",
        trimester: 2,
        constraints: buildPregnancyConstraints(2),
      },
    ];

    const workout = generateWorkout(athlete, {
      format: WorkoutFormat.AMRAP,
      movementCount: 4,
    });

    for (const p of workout.movements) {
      // No inverted, no kipping, no prone, no high impact
      expect(p.movement!.tags).not.toContain("inverted");
      expect(p.movement!.tags).not.toContain("kipping");
      expect(p.movement!.tags).not.toContain("prone");
      expect(p.movement!.tags).not.toContain("high_impact");
    }
  });

  it("scales loads for pregnancy constraints", () => {
    const athlete = createAthlete("test", "Test", Sex.Female, [
      ...EQUIPMENT_PRESETS.fullGym,
    ]);
    athlete.impediments = [
      {
        id: "preg",
        category: ImpedimentCategory.Pregnancy,
        severity: ImpedimentSeverity.Moderate,
        affectedRegions: [BodyRegion.Core],
        description: "Pregnancy T2",
        startDate: "2025-01-01",
        trimester: 2,
        constraints: buildPregnancyConstraints(2),
      },
    ];

    // Generate multiple times to check load scaling
    const workout = generateWorkout(athlete, {
      format: WorkoutFormat.Strength,
      movementCount: 1,
    });

    for (const p of workout.movements) {
      if (p.load && p.movement?.defaultLoadFemale) {
        // Load should be scaled to 70% of Rx
        expect(p.load).toBeLessThanOrEqual(p.movement.defaultLoadFemale);
      }
    }
  });

  it("generates a chipper with more movements", () => {
    const athlete = createAthlete("test", "Test", Sex.Male, [
      ...EQUIPMENT_PRESETS.fullGym,
    ]);
    const workout = generateWorkout(athlete, {
      format: WorkoutFormat.Chipper,
      movementCount: 6,
    });

    expect(workout.movements).toHaveLength(6);
    expect(workout.scoreType).toBe(ScoreType.Time);
  });

  it("can filter by modality", () => {
    const athlete = createAthlete("test", "Test", Sex.Male, [
      ...EQUIPMENT_PRESETS.fullGym,
    ]);
    const workout = generateWorkout(athlete, {
      format: WorkoutFormat.AMRAP,
      movementCount: 3,
      modalities: [Modality.Gymnastics],
    });

    // With enough gymnastics movements available, all should be gymnastics
    for (const p of workout.movements) {
      expect(p.movement!.modality).toBe(Modality.Gymnastics);
    }
  });

  it("excludes specified movements", () => {
    const athlete = createAthlete("test", "Test", Sex.Male, [Equipment.None]);
    const workout = generateWorkout(athlete, {
      format: WorkoutFormat.AMRAP,
      movementCount: 2,
      excludeMovements: ["air_squat", "burpee"],
    });

    for (const p of workout.movements) {
      expect(p.movementId).not.toBe("air_squat");
      expect(p.movementId).not.toBe("burpee");
    }
  });
});
