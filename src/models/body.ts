/**
 * Body regions used for:
 * - Tagging which areas a movement stresses
 * - Flagging injury/impediment locations
 * - Tracking volume distribution across the body
 */
export enum BodyRegion {
  // Upper body
  Shoulders = "shoulders",
  Chest = "chest",
  UpperBack = "upper_back",
  Lats = "lats",
  Biceps = "biceps",
  Triceps = "triceps",
  Forearms = "forearms",
  // Core
  Core = "core",
  LowerBack = "lower_back",
  Obliques = "obliques",
  // Lower body
  Quads = "quads",
  Hamstrings = "hamstrings",
  Glutes = "glutes",
  Calves = "calves",
  HipFlexors = "hip_flexors",
  Adductors = "adductors",
  // Joints (important for impediments)
  Wrists = "wrists",
  Elbows = "elbows",
  Knees = "knees",
  Ankles = "ankles",
  Hips = "hips",
  Spine = "spine",
  Neck = "neck",
}

/**
 * Broader muscle group categories for high-level volume tracking.
 */
export enum MuscleGroup {
  Push = "push",
  Pull = "pull",
  Squat = "squat",
  Hinge = "hinge",
  Core = "core",
  Carry = "carry",
}

/**
 * Movement modality / training domain.
 */
export enum Modality {
  Weightlifting = "weightlifting", // barbell, dumbbell, kettlebell strength
  Gymnastics = "gymnastics", // bodyweight, ring work, handstands
  Monostructural = "monostructural", // run, row, bike, ski, jump rope
  Strongman = "strongman", // sled, sandbag, carries
}
