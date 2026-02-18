import type { Movement } from "../models/movement.js";
import type { Workout, MovementPrescription } from "../models/workout.js";
import { DifficultyTier } from "../models/movement.js";
import { getMovement, getAllMovements } from "../movements/library.js";
import type { EquipmentInventory } from "../models/equipment.js";
import { checkMovement } from "./constraint-engine.js";

/**
 * Ordered difficulty tiers from easiest to hardest.
 */
const TIER_ORDER: DifficultyTier[] = [
  DifficultyTier.Beginner,
  DifficultyTier.Intermediate,
  DifficultyTier.Advanced,
  DifficultyTier.Rx,
  DifficultyTier.RxPlus,
];

function tierIndex(tier: DifficultyTier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * Load scaling factors per tier, relative to Rx loads.
 */
const TIER_LOAD_SCALE: Record<DifficultyTier, number> = {
  [DifficultyTier.Beginner]: 0.45,
  [DifficultyTier.Intermediate]: 0.65,
  [DifficultyTier.Advanced]: 0.85,
  [DifficultyTier.Rx]: 1.0,
  [DifficultyTier.RxPlus]: 1.1,
};

/**
 * Rep scaling factors per tier, relative to Rx reps.
 * Beginners get fewer reps to maintain quality; Rx+ gets more.
 */
const TIER_REP_SCALE: Record<DifficultyTier, number> = {
  [DifficultyTier.Beginner]: 0.6,
  [DifficultyTier.Intermediate]: 0.8,
  [DifficultyTier.Advanced]: 1.0,
  [DifficultyTier.Rx]: 1.0,
  [DifficultyTier.RxPlus]: 1.2,
};

/**
 * A scaled version of a workout at a specific difficulty tier.
 */
export interface ScaledWorkout {
  /** The difficulty tier this version targets */
  tier: DifficultyTier;
  /** The workout with scaled movements, loads, and reps */
  workout: Workout;
  /** Per-movement scaling notes explaining what changed */
  scalingNotes: ScalingNote[];
}

export interface ScalingNote {
  /** Original movement ID */
  originalId: string;
  /** Original movement name */
  originalName: string;
  /** What happened: "kept", "substituted", "scaled_load", "scaled_reps" */
  changes: string[];
  /** The movement used in this tier */
  tieredMovementId: string;
  tieredMovementName: string;
}

/**
 * Find a substitute for a movement at a target difficulty tier.
 *
 * Walks the substitution chain and searches the library for a movement
 * in the same muscle group(s) at or below the target tier.
 */
function findTieredMovement(
  movement: Movement,
  targetTier: DifficultyTier,
  equipment: EquipmentInventory
): Movement {
  const targetIdx = tierIndex(targetTier);
  const movementIdx = tierIndex(movement.difficulty);

  // If the movement is already at or below the target tier, keep it
  if (movementIdx <= targetIdx) return movement;

  // Check substitution chain for something at or below the target tier
  for (const subId of movement.substitutions) {
    const candidate = getMovement(subId);
    if (!candidate) continue;

    const check = checkMovement(candidate, null, equipment);
    if (!check.allowed) continue;

    if (tierIndex(candidate.difficulty) <= targetIdx) {
      return candidate;
    }
  }

  // Broader search: same muscle group, at or below target tier
  const originalGroups = new Set(movement.muscleGroups);
  const candidates: Array<{ m: Movement; score: number }> = [];

  for (const candidate of getAllMovements()) {
    if (candidate.id === movement.id) continue;

    const check = checkMovement(candidate, null, equipment);
    if (!check.allowed) continue;

    if (tierIndex(candidate.difficulty) > targetIdx) continue;

    const sharedGroups = candidate.muscleGroups.filter((g) =>
      originalGroups.has(g)
    ).length;
    if (sharedGroups === 0) continue;

    const sameModality = candidate.modality === movement.modality ? 1 : 0;
    const score = sharedGroups * 10 + sameModality;
    candidates.push({ m: candidate, score });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].m;
  }

  // No substitute found, keep original
  return movement;
}

/**
 * Scale a single movement prescription to a target tier.
 */
function scalePrescription(
  prescription: MovementPrescription,
  targetTier: DifficultyTier,
  equipment: EquipmentInventory
): { prescription: MovementPrescription; note: ScalingNote } {
  const original = prescription.movement ?? getMovement(prescription.movementId);
  if (!original) {
    return {
      prescription: { ...prescription },
      note: {
        originalId: prescription.movementId,
        originalName: prescription.movementId,
        changes: [],
        tieredMovementId: prescription.movementId,
        tieredMovementName: prescription.movementId,
      },
    };
  }

  const tiered = findTieredMovement(original, targetTier, equipment);
  const changes: string[] = [];

  const scaled: MovementPrescription = {
    movementId: tiered.id,
    movement: tiered,
  };

  if (tiered.id !== original.id) {
    changes.push(`substituted: ${original.name} → ${tiered.name}`);
  } else {
    changes.push("kept");
  }

  // Scale load
  const loadScale = TIER_LOAD_SCALE[targetTier];
  if (prescription.load !== undefined) {
    scaled.load = Math.round(prescription.load * loadScale);
    if (loadScale !== 1.0) {
      changes.push(`load: ${prescription.load}lbs → ${scaled.load}lbs`);
    }
  }

  // Scale reps
  const repScale = TIER_REP_SCALE[targetTier];
  if (prescription.reps !== undefined && prescription.reps > 0) {
    scaled.reps = Math.max(1, Math.round(prescription.reps * repScale));
    if (repScale !== 1.0) {
      changes.push(`reps: ${prescription.reps} → ${scaled.reps}`);
    }
  } else if (prescription.reps !== undefined) {
    scaled.reps = prescription.reps;
  }

  // Pass through distance, duration, calories unchanged
  if (prescription.distance !== undefined) scaled.distance = prescription.distance;
  if (prescription.duration !== undefined) scaled.duration = prescription.duration;
  if (prescription.calories !== undefined) scaled.calories = prescription.calories;
  if (prescription.notes !== undefined) scaled.notes = prescription.notes;

  return {
    prescription: scaled,
    note: {
      originalId: original.id,
      originalName: original.name,
      changes,
      tieredMovementId: tiered.id,
      tieredMovementName: tiered.name,
    },
  };
}

/**
 * Generate a scaled version of a workout at a specific difficulty tier.
 */
export function scaleWorkoutToTier(
  workout: Workout,
  targetTier: DifficultyTier,
  equipment: EquipmentInventory
): ScaledWorkout {
  const scalingNotes: ScalingNote[] = [];
  const scaledMovements: MovementPrescription[] = [];

  for (const p of workout.movements) {
    const { prescription, note } = scalePrescription(p, targetTier, equipment);
    scaledMovements.push(prescription);
    scalingNotes.push(note);
  }

  const scaledWorkout: Workout = {
    ...workout,
    id: `${workout.id}_${targetTier}`,
    name: `${workout.name} (${tierLabel(targetTier)})`,
    movements: scaledMovements,
  };

  return {
    tier: targetTier,
    workout: scaledWorkout,
    scalingNotes,
  };
}

/**
 * Generate all scaling tiers for a workout.
 * Returns an array of scaled workouts from Beginner through Rx+.
 */
export function generateAllScalingTiers(
  workout: Workout,
  equipment: EquipmentInventory
): ScaledWorkout[] {
  return TIER_ORDER.map((tier) =>
    scaleWorkoutToTier(workout, tier, equipment)
  );
}

function tierLabel(tier: DifficultyTier): string {
  switch (tier) {
    case DifficultyTier.Beginner:
      return "Beginner";
    case DifficultyTier.Intermediate:
      return "Intermediate";
    case DifficultyTier.Advanced:
      return "Advanced";
    case DifficultyTier.Rx:
      return "Rx";
    case DifficultyTier.RxPlus:
      return "Rx+";
  }
}
