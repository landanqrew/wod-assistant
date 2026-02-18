import { ScoreType } from "./workout.js";

/**
 * A logged result from completing a workout.
 */
export interface WorkoutResult {
  id: string;
  /** Athlete who performed the workout */
  athleteId: string;
  /** Workout that was performed */
  workoutId: string;
  /** When the workout was performed (ISO date string) */
  performedAt: string;
  /** The score type that was used */
  scoreType: ScoreType;
  /** Time in seconds (for ForTime / RoundsForTime / Chipper) */
  timeSeconds?: number;
  /** Rounds completed (for AMRAP) */
  roundsCompleted?: number;
  /** Reps in the partial round (for AMRAP) */
  partialReps?: number;
  /** Peak load achieved in lbs (for Strength) */
  peakLoad?: number;
  /** Total reps (for Tabata or rep-based scoring) */
  totalReps?: number;
  /** Calories (for calorie-based scoring) */
  totalCalories?: number;
  /** Distance in meters (for distance-based scoring) */
  totalDistance?: number;
  /** Rate of Perceived Exertion (1-10 scale) */
  rpe?: number;
  /** Whether the workout was completed as prescribed */
  rx: boolean;
  /** The scaling tier used, if applicable */
  scalingTier?: string;
  /** Per-movement results for detailed tracking */
  movementResults: MovementResult[];
  /** Free-form notes */
  notes?: string;
}

/**
 * Result data for a single movement within a workout.
 */
export interface MovementResult {
  /** The movement ID that was actually performed (may differ from prescription if scaled) */
  movementId: string;
  /** Load used in lbs */
  load?: number;
  /** Reps completed */
  reps?: number;
  /** Whether this specific movement was performed as prescribed */
  rx: boolean;
}

/**
 * A personal record for a specific movement or workout.
 */
export interface PersonalRecord {
  id: string;
  athleteId: string;
  /** What the PR is for -- a movement ID or workout ID */
  referenceId: string;
  /** Whether this is a movement PR or a workout PR */
  referenceType: "movement" | "workout";
  /** Category of PR (e.g., "1rm", "3rm", "max_reps", "fastest_time") */
  category: PRCategory;
  /** The numeric value of the record */
  value: number;
  /** Unit for the value */
  unit: PRUnit;
  /** When this PR was set */
  achievedAt: string;
  /** The workout result ID that produced this PR, if applicable */
  workoutResultId?: string;
  /** Previous value (for tracking improvement) */
  previousValue?: number;
}

export type PRCategory =
  | "1rm"
  | "3rm"
  | "5rm"
  | "max_reps"
  | "max_unbroken"
  | "fastest_time"
  | "most_rounds"
  | "heaviest_load";

export type PRUnit = "lbs" | "kg" | "seconds" | "reps" | "rounds_reps" | "meters" | "calories";

/**
 * Helper to create a new workout result.
 */
export function createWorkoutResult(
  athleteId: string,
  workoutId: string,
  scoreType: ScoreType,
  rx: boolean
): WorkoutResult {
  return {
    id: `result_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    athleteId,
    workoutId,
    performedAt: new Date().toISOString(),
    scoreType,
    rx,
    movementResults: [],
  };
}
