import { Equipment, EquipmentInventory } from "./equipment.js";
import { Impediment } from "./impediment.js";

export enum Sex {
  Male = "male",
  Female = "female",
}

/**
 * An athlete's profile containing their preferences,
 * available equipment, and active impediments.
 */
export interface Athlete {
  id: string;
  name: string;
  sex: Sex;
  /** Available equipment */
  equipment: EquipmentInventory;
  /** Active physical impediments / constraints */
  impediments: Impediment[];
  /** Preferred workout duration in minutes */
  preferredDuration?: number;
  /** Fitness framework preference */
  framework?: string;
  /** Notes */
  notes?: string;
}

/**
 * Create a new athlete with sensible defaults.
 */
export function createAthlete(
  id: string,
  name: string,
  sex: Sex,
  equipment: Equipment[] = []
): Athlete {
  return {
    id,
    name,
    sex,
    equipment: new Set(equipment),
    impediments: [],
  };
}
