import { BodyRegion, Modality, MuscleGroup } from "./body.js";
import { Equipment } from "./equipment.js";

/**
 * Difficulty tier for scaling.
 */
export enum DifficultyTier {
  Beginner = "beginner",
  Intermediate = "intermediate",
  Advanced = "advanced",
  Rx = "rx",
  RxPlus = "rx_plus",
}

/**
 * Tags for fine-grained filtering and constraint matching.
 * Movements can have multiple tags.
 */
export type MovementTag =
  | "max_effort" // 1RM attempts, heavy singles
  | "high_skill" // muscle-ups, handstand walks, snatch
  | "complex" // multi-part lifts, complexes
  | "high_impact" // box jumps, running, double-unders
  | "overhead" // any weight held overhead
  | "inverted" // handstands, handstand push-ups
  | "prone" // lying face-down
  | "supine" // lying face-up
  | "kipping" // kipping pull-ups, toes-to-bar, etc.
  | "axial_load" // heavy back squat, deadlift -- spine compression
  | "unilateral" // single-arm or single-leg
  | "isometric" // holds, planks
  | "plyometric" // explosive jumping movements
  | "rotational"; // movements with twisting

/**
 * How a movement is typically loaded / scored.
 */
export enum LoadType {
  Bodyweight = "bodyweight",
  Weighted = "weighted", // external load (barbell, DB, KB)
  Distance = "distance", // run 400m
  Duration = "duration", // hold for 30s, row for cals
  Calories = "calories", // row/bike for calories
}

/**
 * A movement in the library.
 */
export interface Movement {
  /** Unique identifier (slug) */
  id: string;
  /** Display name */
  name: string;
  /** Equipment required (ALL must be available) */
  equipment: Equipment[];
  /** Primary body regions stressed */
  primaryRegions: BodyRegion[];
  /** Secondary body regions involved */
  secondaryRegions: BodyRegion[];
  /** High-level muscle group category */
  muscleGroups: MuscleGroup[];
  /** Training modality */
  modality: Modality;
  /** Difficulty tier at Rx */
  difficulty: DifficultyTier;
  /** Descriptive tags for constraint matching */
  tags: MovementTag[];
  /** How this movement is loaded */
  loadType: LoadType;
  /** Default Rx load for men (lbs), if applicable */
  defaultLoadMale?: number;
  /** Default Rx load for women (lbs), if applicable */
  defaultLoadFemale?: number;
  /**
   * Ordered list of substitution IDs from easiest to hardest.
   * The movement itself should NOT be in this list.
   * Used by the scaling engine to find appropriate alternatives.
   */
  substitutions: string[];
  /** Brief description or coaching cue */
  description?: string;
}
