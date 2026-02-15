import type { Movement } from "../models/movement.js";
import type { Athlete } from "../models/athlete.js";
import type { MovementPrescription, Workout } from "../models/workout.js";
import { WorkoutFormat, ScoreType } from "../models/workout.js";
import { Modality, MuscleGroup } from "../models/body.js";
import { Sex } from "../models/athlete.js";
import { getAllMovements } from "../movements/library.js";
import { mergeConstraints, filterAllowedMovements } from "../scaling/index.js";

/**
 * Options for generating a workout.
 */
export interface GenerateOptions {
  /** Desired workout format */
  format: WorkoutFormat;
  /** Number of distinct movements to include */
  movementCount?: number;
  /** Target modalities to include (empty = any) */
  modalities?: Modality[];
  /** Target muscle groups to bias toward (empty = balanced) */
  muscleGroups?: MuscleGroup[];
  /** Time cap in minutes (for AMRAP, ForTime) */
  timeCap?: number;
  /** Number of rounds (for EMOM, RoundsForTime) */
  rounds?: number;
  /** EMOM duration in minutes */
  emomMinutes?: number;
  /** Movements to exclude by ID */
  excludeMovements?: string[];
}

const FORMAT_DEFAULTS: Record<
  WorkoutFormat,
  { movementCount: number; timeCap?: number; rounds?: number; emomMinutes?: number }
> = {
  [WorkoutFormat.AMRAP]: { movementCount: 3, timeCap: 12 },
  [WorkoutFormat.EMOM]: { movementCount: 3, emomMinutes: 12 },
  [WorkoutFormat.ForTime]: { movementCount: 3, timeCap: 15 },
  [WorkoutFormat.RoundsForTime]: { movementCount: 3, rounds: 5, timeCap: 20 },
  [WorkoutFormat.Tabata]: { movementCount: 4 },
  [WorkoutFormat.Interval]: { movementCount: 2 },
  [WorkoutFormat.Strength]: { movementCount: 1 },
  [WorkoutFormat.Chipper]: { movementCount: 6, timeCap: 25 },
  [WorkoutFormat.Ladder]: { movementCount: 2, timeCap: 15 },
};

/**
 * Pick N random items from an array (Fisher-Yates partial shuffle).
 */
function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

/**
 * Assign default reps/load for a movement prescription based on format.
 */
function prescribeMovement(
  movement: Movement,
  format: WorkoutFormat,
  sex: Sex
): MovementPrescription {
  const prescription: MovementPrescription = {
    movementId: movement.id,
    movement,
  };

  const defaultLoad =
    sex === Sex.Male ? movement.defaultLoadMale : movement.defaultLoadFemale;

  switch (movement.loadType) {
    case "bodyweight":
      prescription.reps = getDefaultReps(format, movement);
      break;
    case "weighted":
      prescription.reps = getDefaultReps(format, movement);
      prescription.load = defaultLoad;
      break;
    case "distance":
      prescription.distance = getDefaultDistance(format);
      break;
    case "calories":
      prescription.calories = getDefaultCalories(format, sex);
      break;
    case "duration":
      prescription.duration = getDefaultDuration(format);
      break;
  }

  return prescription;
}

function getDefaultReps(format: WorkoutFormat, movement: Movement): number {
  switch (format) {
    case WorkoutFormat.AMRAP:
      return movement.modality === Modality.Weightlifting ? 10 : 15;
    case WorkoutFormat.EMOM:
      return movement.modality === Modality.Weightlifting ? 5 : 10;
    case WorkoutFormat.ForTime:
    case WorkoutFormat.RoundsForTime:
      return movement.modality === Modality.Weightlifting ? 10 : 15;
    case WorkoutFormat.Tabata:
      return 0; // Tabata is max effort
    case WorkoutFormat.Strength:
      return 5;
    case WorkoutFormat.Chipper:
      return 30;
    case WorkoutFormat.Ladder:
      return 1; // ladders use ascending/descending reps
    default:
      return 10;
  }
}

function getDefaultDistance(format: WorkoutFormat): number {
  switch (format) {
    case WorkoutFormat.AMRAP:
    case WorkoutFormat.EMOM:
      return 200; // meters
    case WorkoutFormat.ForTime:
    case WorkoutFormat.RoundsForTime:
      return 400;
    case WorkoutFormat.Chipper:
      return 800;
    default:
      return 400;
  }
}

function getDefaultCalories(format: WorkoutFormat, sex: Sex): number {
  const base = sex === Sex.Male ? 15 : 12;
  switch (format) {
    case WorkoutFormat.EMOM:
      return Math.round(base * 0.7);
    case WorkoutFormat.Chipper:
      return base * 2;
    default:
      return base;
  }
}

function getDefaultDuration(_format: WorkoutFormat): number {
  return 30; // seconds
}

/**
 * Get the score type for a workout format.
 */
function getScoreType(format: WorkoutFormat): ScoreType {
  switch (format) {
    case WorkoutFormat.AMRAP:
      return ScoreType.RoundsAndReps;
    case WorkoutFormat.ForTime:
    case WorkoutFormat.RoundsForTime:
    case WorkoutFormat.Chipper:
      return ScoreType.Time;
    case WorkoutFormat.Strength:
      return ScoreType.Load;
    case WorkoutFormat.Tabata:
      return ScoreType.Reps;
    case WorkoutFormat.EMOM:
    case WorkoutFormat.Interval:
    case WorkoutFormat.Ladder:
      return ScoreType.None;
    default:
      return ScoreType.None;
  }
}

/**
 * Generate a workout for an athlete.
 *
 * The generator:
 * 1. Filters the movement library by athlete equipment + impediments
 * 2. Applies modality / muscle group preferences
 * 3. Picks movements to create variety
 * 4. Assigns reps/loads/distances based on format and athlete sex
 */
export function generateWorkout(
  athlete: Athlete,
  options: GenerateOptions
): Workout {
  const defaults = FORMAT_DEFAULTS[options.format];
  const movementCount = options.movementCount ?? defaults.movementCount;

  // Get all movements, filtered by athlete constraints
  const constraints = mergeConstraints(athlete.impediments);
  let available = filterAllowedMovements(
    getAllMovements(),
    constraints,
    athlete.equipment
  );

  // Exclude specific movements if requested
  if (options.excludeMovements?.length) {
    const excluded = new Set(options.excludeMovements);
    available = available.filter((m) => !excluded.has(m.id));
  }

  // Filter by modality preference
  if (options.modalities?.length) {
    const modalitySet = new Set(options.modalities);
    const filtered = available.filter((m) => modalitySet.has(m.modality));
    if (filtered.length >= movementCount) {
      available = filtered;
    }
    // If not enough movements in preferred modalities, use full pool
  }

  // Bias toward requested muscle groups
  if (options.muscleGroups?.length) {
    const groupSet = new Set(options.muscleGroups);
    const preferred = available.filter((m) =>
      m.muscleGroups.some((g) => groupSet.has(g))
    );
    if (preferred.length >= movementCount) {
      available = preferred;
    }
  }

  // Pick movements, trying for modality diversity
  const selected = selectDiverseMovements(available, movementCount);

  // Build prescriptions
  const prescriptions = selected.map((m) =>
    prescribeMovement(m, options.format, athlete.sex)
  );

  // Apply load scaling from constraints
  if (constraints?.maxLoadPercent !== undefined) {
    for (const p of prescriptions) {
      if (p.load !== undefined) {
        p.load = Math.round(p.load * (constraints.maxLoadPercent / 100));
      }
    }
  }

  const workout: Workout = {
    id: generateId(),
    name: formatWorkoutName(options.format, selected),
    format: options.format,
    movements: prescriptions,
    timeCap: options.timeCap ?? defaults.timeCap,
    rounds: options.rounds ?? defaults.rounds,
    emomMinutes: options.emomMinutes ?? defaults.emomMinutes,
    scoreType: getScoreType(options.format),
    isBenchmark: false,
    estimatedDuration: estimateDuration(options),
  };

  return workout;
}

/**
 * Select movements with modality diversity.
 * Tries to avoid picking all movements from the same modality.
 */
function selectDiverseMovements(
  pool: Movement[],
  count: number
): Movement[] {
  if (pool.length <= count) return [...pool];

  // Group by modality
  const byModality = new Map<Modality, Movement[]>();
  for (const m of pool) {
    const group = byModality.get(m.modality) ?? [];
    group.push(m);
    byModality.set(m.modality, group);
  }

  const modalities = [...byModality.keys()];
  const selected: Movement[] = [];
  const usedIds = new Set<string>();

  // Round-robin through modalities
  let modalityIdx = 0;
  while (selected.length < count) {
    const modality = modalities[modalityIdx % modalities.length];
    const candidates = (byModality.get(modality) ?? []).filter(
      (m) => !usedIds.has(m.id)
    );

    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      selected.push(pick);
      usedIds.add(pick.id);
    }

    modalityIdx++;

    // Safety: if we've gone through all modalities without finding new movements
    if (modalityIdx > count * modalities.length) break;
  }

  return selected;
}

function generateId(): string {
  return `wod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatWorkoutName(format: WorkoutFormat, movements: Movement[]): string {
  const movementNames = movements.slice(0, 3).map((m) => m.name);
  const suffix = movements.length > 3 ? " + more" : "";
  return `${format.toUpperCase()}: ${movementNames.join(", ")}${suffix}`;
}

function estimateDuration(options: GenerateOptions): number {
  const defaults = FORMAT_DEFAULTS[options.format];
  if (options.timeCap) return options.timeCap;
  if (options.emomMinutes) return options.emomMinutes;
  if (defaults.timeCap) return defaults.timeCap;
  if (defaults.emomMinutes) return defaults.emomMinutes;
  return 15; // default fallback
}
