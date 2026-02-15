import { Movement } from "./movement.js";

/**
 * Workout format types.
 */
export enum WorkoutFormat {
  /** As Many Rounds/Reps As Possible in a time cap */
  AMRAP = "amrap",
  /** Every Minute On the Minute */
  EMOM = "emom",
  /** Complete work for time */
  ForTime = "for_time",
  /** Rounds for time (e.g., 5 rounds of...) */
  RoundsForTime = "rounds_for_time",
  /** Tabata intervals (20s on / 10s off) */
  Tabata = "tabata",
  /** Custom interval (configurable work/rest) */
  Interval = "interval",
  /** Straight strength sets (e.g., 5x5 back squat) */
  Strength = "strength",
  /** Chipper -- long list of movements done once through */
  Chipper = "chipper",
  /** Ladder -- ascending or descending rep scheme */
  Ladder = "ladder",
}

/**
 * A single movement prescription within a workout.
 */
export interface MovementPrescription {
  /** Reference to the movement */
  movementId: string;
  /** Resolved movement (populated at runtime) */
  movement?: Movement;
  /** Reps per round (if applicable) */
  reps?: number;
  /** Load in lbs (if applicable) */
  load?: number;
  /** Distance in meters (if applicable) */
  distance?: number;
  /** Duration in seconds (if applicable) */
  duration?: number;
  /** Calories (if applicable) */
  calories?: number;
  /** Notes (e.g., "each arm", "unbroken") */
  notes?: string;
}

/**
 * A workout definition.
 */
export interface Workout {
  id: string;
  name: string;
  format: WorkoutFormat;
  /** Movements with their prescriptions */
  movements: MovementPrescription[];
  /** Time cap in minutes (for AMRAP, ForTime) */
  timeCap?: number;
  /** Number of rounds (for RoundsForTime, EMOM) */
  rounds?: number;
  /** Work interval in seconds (for EMOM, Interval, Tabata) */
  workInterval?: number;
  /** Rest interval in seconds (for Interval, Tabata) */
  restInterval?: number;
  /** Total EMOM minutes */
  emomMinutes?: number;
  /** Scoring: what the athlete records as their result */
  scoreType: ScoreType;
  /** Description or intent */
  description?: string;
  /** Is this a named benchmark? */
  isBenchmark: boolean;
  /** Estimated duration in minutes */
  estimatedDuration?: number;
}

export enum ScoreType {
  Time = "time",
  RoundsAndReps = "rounds_and_reps",
  Load = "load",
  Reps = "reps",
  Calories = "calories",
  Distance = "distance",
  None = "none",
}

/**
 * Time blocks within a training session.
 */
export enum SessionBlockType {
  WarmUp = "warm_up",
  Skill = "skill",
  Strength = "strength",
  Metcon = "metcon",
  Accessory = "accessory",
  CoolDown = "cool_down",
}

export interface SessionBlock {
  type: SessionBlockType;
  durationMinutes: number;
  workout?: Workout;
  notes?: string;
}

export interface TrainingSession {
  id: string;
  date: string;
  blocks: SessionBlock[];
  totalDurationMinutes: number;
  notes?: string;
}
