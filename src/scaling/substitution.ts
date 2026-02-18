import type { Movement } from "../models/movement.js";
import type { MovementConstraint } from "../models/impediment.js";
import type { EquipmentInventory } from "../models/equipment.js";
import { getMovement, getAllMovements } from "../movements/library.js";
import { checkMovement } from "./constraint-engine.js";

/**
 * Result of attempting to find a substitution.
 */
export interface SubstitutionResult {
  /** The original movement that needed substitution */
  original: Movement;
  /** The replacement movement, or null if no valid substitute found */
  replacement: Movement | null;
  /** Why the original was rejected */
  originalReasons: string[];
  /** If replacement found, any warnings about it */
  replacementWarnings: string[];
  /** Load scaling factor (e.g., 0.7 = use 70% of normal load) */
  loadScale: number;
}

/**
 * Find the best substitution for a movement given constraints and equipment.
 *
 * Strategy:
 * 1. Walk the movement's substitution chain
 * 2. For each candidate, check if it passes constraints + equipment
 * 3. Return the first valid substitute
 * 4. If none found in the chain, search the full library for a movement
 *    in the same muscle group(s) that is allowed
 */
export function findSubstitution(
  movement: Movement,
  constraints: MovementConstraint | null,
  equipment: EquipmentInventory
): SubstitutionResult {
  const originalCheck = checkMovement(movement, constraints, equipment);

  // If the original is allowed, no substitution needed
  if (originalCheck.allowed) {
    return {
      original: movement,
      replacement: movement,
      originalReasons: [],
      replacementWarnings: originalCheck.warnings,
      loadScale: originalCheck.maxLoadPercent
        ? originalCheck.maxLoadPercent / 100
        : 1,
    };
  }

  // Walk the substitution chain
  for (const subId of movement.substitutions) {
    const candidate = getMovement(subId);
    if (!candidate) continue;

    const candidateCheck = checkMovement(candidate, constraints, equipment);
    if (candidateCheck.allowed) {
      return {
        original: movement,
        replacement: candidate,
        originalReasons: originalCheck.reasons,
        replacementWarnings: candidateCheck.warnings,
        loadScale: candidateCheck.maxLoadPercent
          ? candidateCheck.maxLoadPercent / 100
          : 1,
      };
    }
  }

  // No direct substitute found -- broader library search by muscle group
  const broadMatch = findBroadSubstitution(movement, constraints, equipment);
  if (broadMatch) {
    const broadCheck = checkMovement(broadMatch, constraints, equipment);
    return {
      original: movement,
      replacement: broadMatch,
      originalReasons: originalCheck.reasons,
      replacementWarnings: [
        ...broadCheck.warnings,
        "Substituted via muscle-group fallback (not a direct substitution)",
      ],
      loadScale: broadCheck.maxLoadPercent
        ? broadCheck.maxLoadPercent / 100
        : 1,
    };
  }

  return {
    original: movement,
    replacement: null,
    originalReasons: originalCheck.reasons,
    replacementWarnings: [],
    loadScale: 0,
  };
}

/**
 * Search the full movement library for a substitute that shares at least one
 * muscle group with the original movement and passes all constraints.
 *
 * Prefers movements that:
 * 1. Share the most muscle groups with the original
 * 2. Are at or below the original's difficulty tier
 * 3. Share the same modality (tie-breaker)
 */
function findBroadSubstitution(
  original: Movement,
  constraints: MovementConstraint | null,
  equipment: EquipmentInventory
): Movement | null {
  const originalGroups = new Set(original.muscleGroups);
  const alreadyTried = new Set([
    original.id,
    ...original.substitutions,
  ]);

  const DIFFICULTY_ORDER = ["beginner", "intermediate", "advanced", "rx", "rx_plus"];
  const originalDiffIdx = DIFFICULTY_ORDER.indexOf(original.difficulty);

  const candidates: Array<{ movement: Movement; score: number }> = [];

  for (const candidate of getAllMovements()) {
    if (alreadyTried.has(candidate.id)) continue;

    // Must share at least one muscle group
    const sharedGroups = candidate.muscleGroups.filter((g) =>
      originalGroups.has(g)
    ).length;
    if (sharedGroups === 0) continue;

    // Must pass constraints + equipment
    const check = checkMovement(candidate, constraints, equipment);
    if (!check.allowed) continue;

    // Score: higher is better
    const candidateDiffIdx = DIFFICULTY_ORDER.indexOf(candidate.difficulty);
    const atOrBelowDifficulty = candidateDiffIdx <= originalDiffIdx ? 1 : 0;
    const sameModality = candidate.modality === original.modality ? 1 : 0;

    const score = sharedGroups * 10 + atOrBelowDifficulty * 5 + sameModality;
    candidates.push({ movement: candidate, score });
  }

  if (candidates.length === 0) return null;

  // Sort by score descending, pick the best
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].movement;
}

/**
 * Scale an entire workout's movements, returning substitutions for each.
 */
export function scaleWorkoutMovements(
  movements: Movement[],
  constraints: MovementConstraint | null,
  equipment: EquipmentInventory
): SubstitutionResult[] {
  return movements.map((m) => findSubstitution(m, constraints, equipment));
}
