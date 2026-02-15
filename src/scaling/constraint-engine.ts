import type { Movement, MovementTag } from "../models/movement.js";
import type { MovementConstraint, Impediment } from "../models/impediment.js";
import type { EquipmentInventory } from "../models/equipment.js";
import { Equipment } from "../models/equipment.js";

/**
 * Result of checking whether a movement is allowed for an athlete.
 */
export interface MovementCheck {
  /** Is the movement allowed? */
  allowed: boolean;
  /** Reasons it was rejected (empty if allowed) */
  reasons: string[];
  /** If load is capped, the max percentage (undefined = no cap) */
  maxLoadPercent?: number;
  /** Suggestions for the athlete/coach */
  warnings: string[];
}

/**
 * Merge multiple impediment constraints into a single combined constraint.
 * Uses the most restrictive value for each field.
 */
export function mergeConstraints(
  impediments: Impediment[]
): MovementConstraint | null {
  if (impediments.length === 0) return null;

  const allConstraints = impediments.map((i) => i.constraints);

  const merged: MovementConstraint = {
    avoidRegions: [...new Set(allConstraints.flatMap((c) => c.avoidRegions))],
    avoidTags: [...new Set(allConstraints.flatMap((c) => c.avoidTags))],
    // For booleans: if ANY constraint disallows, it's disallowed
    allowHighImpact: allConstraints.every((c) => c.allowHighImpact),
    allowOverhead: allConstraints.every((c) => c.allowOverhead),
    allowInversion: allConstraints.every((c) => c.allowInversion),
    allowProne: allConstraints.every((c) => c.allowProne),
    allowKipping: allConstraints.every((c) => c.allowKipping),
    allowHeavyAxialLoad: allConstraints.every((c) => c.allowHeavyAxialLoad),
    // For load percent: use the lowest cap
    maxLoadPercent: getMinLoadPercent(allConstraints),
  };

  return merged;
}

function getMinLoadPercent(constraints: MovementConstraint[]): number | undefined {
  const caps = constraints
    .map((c) => c.maxLoadPercent)
    .filter((v): v is number => v !== undefined);
  if (caps.length === 0) return undefined;
  return Math.min(...caps);
}

/**
 * Check whether a specific movement is allowed given combined constraints
 * and available equipment.
 */
export function checkMovement(
  movement: Movement,
  constraints: MovementConstraint | null,
  equipment: EquipmentInventory
): MovementCheck {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // ── Equipment check ──────────────────────────────────────────────
  for (const req of movement.equipment) {
    if (req !== Equipment.None && !equipment.has(req)) {
      reasons.push(`Missing equipment: ${req}`);
    }
  }

  // If no constraints, only equipment matters
  if (!constraints) {
    return {
      allowed: reasons.length === 0,
      reasons,
      warnings,
    };
  }

  // ── Body region check ────────────────────────────────────────────
  const stressedRegions = [
    ...movement.primaryRegions,
    ...movement.secondaryRegions,
  ];
  const hitRegions = stressedRegions.filter((r) =>
    constraints.avoidRegions.includes(r)
  );
  if (hitRegions.length > 0) {
    // Primary region hit = hard block. Secondary = warning.
    const primaryHits = movement.primaryRegions.filter((r) =>
      constraints.avoidRegions.includes(r)
    );
    const secondaryHits = movement.secondaryRegions.filter((r) =>
      constraints.avoidRegions.includes(r)
    );

    if (primaryHits.length > 0) {
      reasons.push(
        `Stresses protected region(s): ${primaryHits.join(", ")}`
      );
    }
    if (secondaryHits.length > 0) {
      warnings.push(
        `Secondarily stresses protected region(s): ${secondaryHits.join(", ")} -- use with caution`
      );
    }
  }

  // ── Tag-based checks ─────────────────────────────────────────────
  const movementTags = new Set<string>(movement.tags);

  for (const avoidTag of constraints.avoidTags) {
    if (movementTags.has(avoidTag)) {
      reasons.push(`Tagged as "${avoidTag}" which is restricted`);
    }
  }

  // ── Specific movement property checks ────────────────────────────
  if (!constraints.allowHighImpact && movementTags.has("high_impact")) {
    reasons.push("High-impact movements restricted");
  }

  if (!constraints.allowOverhead && movementTags.has("overhead")) {
    reasons.push("Overhead movements restricted");
  }

  if (!constraints.allowInversion && movementTags.has("inverted")) {
    reasons.push("Inverted positions restricted");
  }

  if (!constraints.allowProne && movementTags.has("prone")) {
    reasons.push("Prone positions restricted");
  }

  if (!constraints.allowKipping && movementTags.has("kipping")) {
    reasons.push("Kipping movements restricted");
  }

  if (!constraints.allowHeavyAxialLoad && movementTags.has("axial_load")) {
    reasons.push("Heavy axial loading restricted");
  }

  // ── Load cap ─────────────────────────────────────────────────────
  let maxLoadPercent: number | undefined;
  if (constraints.maxLoadPercent !== undefined) {
    maxLoadPercent = constraints.maxLoadPercent;
    if (maxLoadPercent === 0 && movement.loadType === "weighted") {
      reasons.push("All weighted loading restricted");
    } else if (maxLoadPercent > 0 && movement.loadType === "weighted") {
      warnings.push(`Load capped at ${maxLoadPercent}% of normal`);
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    maxLoadPercent,
    warnings,
  };
}

/**
 * Filter a list of movements to only those allowed by constraints + equipment.
 */
export function filterAllowedMovements(
  movements: Movement[],
  constraints: MovementConstraint | null,
  equipment: EquipmentInventory
): Movement[] {
  return movements.filter(
    (m) => checkMovement(m, constraints, equipment).allowed
  );
}
