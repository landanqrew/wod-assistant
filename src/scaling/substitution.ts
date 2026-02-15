import type { Movement } from "../models/movement.js";
import type { MovementConstraint } from "../models/impediment.js";
import type { EquipmentInventory } from "../models/equipment.js";
import { getMovement } from "../movements/library.js";
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

  // No direct substitute found -- return null
  // Future: could do a broader library search by muscle group here
  return {
    original: movement,
    replacement: null,
    originalReasons: originalCheck.reasons,
    replacementWarnings: [],
    loadScale: 0,
  };
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
