/**
 * Equipment that may be required for movements.
 * Used both for movement metadata and athlete equipment availability.
 */
export enum Equipment {
  // Barbells & plates
  Barbell = "barbell",
  Plates = "plates",
  // Dumbbells & kettlebells
  Dumbbell = "dumbbell",
  Kettlebell = "kettlebell",
  // Bodyweight / gymnastics
  PullUpBar = "pull_up_bar",
  Rings = "rings",
  ParallettesBars = "parallettes",
  GHD = "ghd",
  AbMat = "ab_mat",
  // Cardio machines
  Rower = "rower",
  BikeErg = "bike_erg",
  SkiErg = "ski_erg",
  AssaultBike = "assault_bike",
  Treadmill = "treadmill",
  // Other
  Box = "box",
  Rope = "rope",
  WallBall = "wall_ball",
  MedicineBall = "medicine_ball",
  ResistanceBand = "resistance_band",
  Sled = "sled",
  Sandbag = "sandbag",
  JumpRope = "jump_rope",
  Bench = "bench",
  SquatRack = "squat_rack",
  // Minimal / no equipment
  None = "none",
}

/** A set of equipment an athlete has available */
export type EquipmentInventory = Set<Equipment>;

export function createInventory(items: Equipment[]): EquipmentInventory {
  return new Set(items);
}

/** Common presets for quick setup */
export const EQUIPMENT_PRESETS = {
  /** Full CrossFit box */
  fullGym: new Set([
    Equipment.Barbell,
    Equipment.Plates,
    Equipment.Dumbbell,
    Equipment.Kettlebell,
    Equipment.PullUpBar,
    Equipment.Rings,
    Equipment.GHD,
    Equipment.AbMat,
    Equipment.Rower,
    Equipment.BikeErg,
    Equipment.SkiErg,
    Equipment.AssaultBike,
    Equipment.Box,
    Equipment.Rope,
    Equipment.WallBall,
    Equipment.JumpRope,
    Equipment.Bench,
    Equipment.SquatRack,
    Equipment.ResistanceBand,
  ]),

  /** Home gym with basics */
  homeGym: new Set([
    Equipment.Barbell,
    Equipment.Plates,
    Equipment.Dumbbell,
    Equipment.Kettlebell,
    Equipment.PullUpBar,
    Equipment.Box,
    Equipment.JumpRope,
    Equipment.ResistanceBand,
    Equipment.Bench,
    Equipment.SquatRack,
  ]),

  /** Minimal / travel setup */
  minimal: new Set([
    Equipment.Dumbbell,
    Equipment.ResistanceBand,
    Equipment.JumpRope,
  ]),

  /** Bodyweight only */
  bodyweight: new Set<Equipment>([Equipment.None]),
} as const;
