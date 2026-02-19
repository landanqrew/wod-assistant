import type { Workout } from "../models/workout.js";
import type { Movement } from "../models/movement.js";
import { BodyRegion, Modality } from "../models/body.js";
import { getMovement } from "../movements/library.js";

/**
 * A warm-up drill with description and target regions.
 */
export interface WarmUpDrill {
  name: string;
  durationOrReps: string;
  targetRegions: BodyRegion[];
  notes?: string;
}

/**
 * General warm-up drills (always included).
 */
const GENERAL_WARMUP: WarmUpDrill[] = [
  {
    name: "Easy Jog / Row",
    durationOrReps: "2 min",
    targetRegions: [],
    notes: "Get blood flowing at conversational pace",
  },
  {
    name: "Jumping Jacks",
    durationOrReps: "20 reps",
    targetRegions: [BodyRegion.Shoulders, BodyRegion.Calves],
  },
];

/**
 * Region-specific mobility and activation drills.
 */
const REGION_DRILLS: Record<string, WarmUpDrill[]> = {
  [BodyRegion.Shoulders]: [
    {
      name: "Arm Circles",
      durationOrReps: "10 each direction",
      targetRegions: [BodyRegion.Shoulders],
    },
    {
      name: "PVC Pass-throughs",
      durationOrReps: "10 reps",
      targetRegions: [BodyRegion.Shoulders, BodyRegion.Chest],
    },
    {
      name: "Band Pull-Aparts",
      durationOrReps: "15 reps",
      targetRegions: [BodyRegion.Shoulders, BodyRegion.UpperBack],
    },
  ],
  [BodyRegion.Hips]: [
    {
      name: "Hip Circles",
      durationOrReps: "10 each direction",
      targetRegions: [BodyRegion.Hips, BodyRegion.Glutes],
    },
    {
      name: "Pigeon Stretch",
      durationOrReps: "30s each side",
      targetRegions: [BodyRegion.Hips, BodyRegion.Glutes],
    },
  ],
  [BodyRegion.Quads]: [
    {
      name: "Walking Quad Stretch",
      durationOrReps: "10 each side",
      targetRegions: [BodyRegion.Quads, BodyRegion.HipFlexors],
    },
    {
      name: "Bodyweight Squats",
      durationOrReps: "10 reps",
      targetRegions: [BodyRegion.Quads, BodyRegion.Glutes],
    },
  ],
  [BodyRegion.Hamstrings]: [
    {
      name: "Inchworms",
      durationOrReps: "5 reps",
      targetRegions: [BodyRegion.Hamstrings, BodyRegion.Core],
    },
    {
      name: "Good Mornings (empty bar or BW)",
      durationOrReps: "10 reps",
      targetRegions: [BodyRegion.Hamstrings, BodyRegion.LowerBack],
    },
  ],
  [BodyRegion.Glutes]: [
    {
      name: "Glute Bridges",
      durationOrReps: "10 reps",
      targetRegions: [BodyRegion.Glutes, BodyRegion.Hamstrings],
    },
    {
      name: "Clamshells",
      durationOrReps: "10 each side",
      targetRegions: [BodyRegion.Glutes, BodyRegion.Hips],
    },
  ],
  [BodyRegion.Core]: [
    {
      name: "Dead Bugs",
      durationOrReps: "10 reps",
      targetRegions: [BodyRegion.Core],
    },
    {
      name: "Plank Hold",
      durationOrReps: "30s",
      targetRegions: [BodyRegion.Core, BodyRegion.Shoulders],
    },
  ],
  [BodyRegion.Chest]: [
    {
      name: "Push-Up to Down Dog",
      durationOrReps: "8 reps",
      targetRegions: [BodyRegion.Chest, BodyRegion.Shoulders],
    },
  ],
  [BodyRegion.UpperBack]: [
    {
      name: "Cat-Cow Stretch",
      durationOrReps: "10 reps",
      targetRegions: [BodyRegion.UpperBack, BodyRegion.LowerBack],
    },
    {
      name: "Scapular Pull-Ups",
      durationOrReps: "10 reps",
      targetRegions: [BodyRegion.UpperBack, BodyRegion.Lats],
    },
  ],
  [BodyRegion.Wrists]: [
    {
      name: "Wrist Circles",
      durationOrReps: "10 each direction",
      targetRegions: [BodyRegion.Wrists],
    },
    {
      name: "Wrist Flexor Stretch",
      durationOrReps: "20s each",
      targetRegions: [BodyRegion.Wrists, BodyRegion.Forearms],
    },
  ],
  [BodyRegion.Ankles]: [
    {
      name: "Ankle Circles",
      durationOrReps: "10 each direction",
      targetRegions: [BodyRegion.Ankles, BodyRegion.Calves],
    },
    {
      name: "Wall Ankle Stretch",
      durationOrReps: "30s each side",
      targetRegions: [BodyRegion.Ankles, BodyRegion.Calves],
    },
  ],
  [BodyRegion.LowerBack]: [
    {
      name: "Cat-Cow Stretch",
      durationOrReps: "10 reps",
      targetRegions: [BodyRegion.LowerBack, BodyRegion.Core],
    },
    {
      name: "Scorpion Stretch",
      durationOrReps: "5 each side",
      targetRegions: [BodyRegion.LowerBack, BodyRegion.Hips],
    },
  ],
  [BodyRegion.Calves]: [
    {
      name: "Calf Raises",
      durationOrReps: "15 reps",
      targetRegions: [BodyRegion.Calves],
    },
  ],
};

/**
 * Modality-specific warm-up additions.
 */
const MODALITY_WARMUP: Partial<Record<Modality, WarmUpDrill[]>> = {
  [Modality.Weightlifting]: [
    {
      name: "Empty Barbell Complex",
      durationOrReps: "5 reps each",
      targetRegions: [BodyRegion.Shoulders, BodyRegion.Hips],
      notes: "Deadlift, Hang Clean, Front Squat, Press, Back Squat",
    },
  ],
  [Modality.Gymnastics]: [
    {
      name: "Hollow Body Hold",
      durationOrReps: "20s",
      targetRegions: [BodyRegion.Core],
    },
    {
      name: "Kipping Swings",
      durationOrReps: "10 reps",
      targetRegions: [BodyRegion.Shoulders, BodyRegion.Core],
      notes: "If pull-up bar movements are in the WOD",
    },
  ],
  [Modality.Monostructural]: [
    {
      name: "Dynamic Stretching",
      durationOrReps: "1 min",
      targetRegions: [BodyRegion.Quads, BodyRegion.Hamstrings, BodyRegion.Calves],
      notes: "High knees, butt kicks, leg swings",
    },
  ],
};

/**
 * Analyze a workout and generate a movement-specific warm-up.
 */
export function generateWarmUp(workout: Workout): WarmUpDrill[] {
  const drills: WarmUpDrill[] = [];
  const usedDrillNames = new Set<string>();

  // 1. Always start with general warm-up
  for (const drill of GENERAL_WARMUP) {
    drills.push(drill);
    usedDrillNames.add(drill.name);
  }

  // 2. Collect all body regions and modalities from the workout
  const regions = new Set<BodyRegion>();
  const modalities = new Set<Modality>();

  for (const p of workout.movements) {
    const movement: Movement | undefined =
      p.movement ?? getMovement(p.movementId);
    if (!movement) continue;

    modalities.add(movement.modality);
    for (const r of movement.primaryRegions) regions.add(r);
    for (const r of movement.secondaryRegions) regions.add(r);
  }

  // 3. Add region-specific drills (pick 1 per region to keep warm-up concise)
  for (const region of regions) {
    const regionDrills = REGION_DRILLS[region];
    if (!regionDrills) continue;

    // Pick the first drill we haven't used yet
    for (const drill of regionDrills) {
      if (!usedDrillNames.has(drill.name)) {
        drills.push(drill);
        usedDrillNames.add(drill.name);
        break;
      }
    }
  }

  // 4. Add modality-specific drills
  for (const modality of modalities) {
    const modalityDrills = MODALITY_WARMUP[modality];
    if (!modalityDrills) continue;

    for (const drill of modalityDrills) {
      if (!usedDrillNames.has(drill.name)) {
        drills.push(drill);
        usedDrillNames.add(drill.name);
      }
    }
  }

  return drills;
}

/**
 * Generate simple cool-down stretches targeting the regions used in the workout.
 */
export interface CoolDownDrill {
  name: string;
  duration: string;
  targetRegions: BodyRegion[];
}

const COOLDOWN_DRILLS: CoolDownDrill[] = [
  { name: "Easy Walk / Slow Row", duration: "2 min", targetRegions: [] },
  {
    name: "Standing Forward Fold",
    duration: "30s",
    targetRegions: [BodyRegion.Hamstrings, BodyRegion.LowerBack],
  },
  {
    name: "Couch Stretch",
    duration: "30s each side",
    targetRegions: [BodyRegion.Quads, BodyRegion.HipFlexors],
  },
  {
    name: "Child's Pose",
    duration: "30s",
    targetRegions: [BodyRegion.LowerBack, BodyRegion.Shoulders, BodyRegion.Lats],
  },
  {
    name: "Pigeon Stretch",
    duration: "30s each side",
    targetRegions: [BodyRegion.Hips, BodyRegion.Glutes],
  },
  {
    name: "Doorway Chest Stretch",
    duration: "30s each side",
    targetRegions: [BodyRegion.Chest, BodyRegion.Shoulders],
  },
  {
    name: "Cross-Body Shoulder Stretch",
    duration: "30s each side",
    targetRegions: [BodyRegion.Shoulders],
  },
  {
    name: "Lying Spinal Twist",
    duration: "30s each side",
    targetRegions: [BodyRegion.LowerBack, BodyRegion.Obliques],
  },
];

/**
 * Generate a cool-down based on the workout's target regions.
 */
export function generateCoolDown(workout: Workout): CoolDownDrill[] {
  const regions = new Set<BodyRegion>();

  for (const p of workout.movements) {
    const movement: Movement | undefined =
      p.movement ?? getMovement(p.movementId);
    if (!movement) continue;
    for (const r of movement.primaryRegions) regions.add(r);
  }

  const drills: CoolDownDrill[] = [];

  // Always include the easy walk
  drills.push(COOLDOWN_DRILLS[0]);

  // Pick stretches that target the worked regions
  for (const drill of COOLDOWN_DRILLS.slice(1)) {
    if (drill.targetRegions.some((r) => regions.has(r))) {
      drills.push(drill);
    }
  }

  // Ensure at least 3 stretches
  if (drills.length < 4) {
    for (const drill of COOLDOWN_DRILLS.slice(1)) {
      if (!drills.includes(drill)) {
        drills.push(drill);
        if (drills.length >= 4) break;
      }
    }
  }

  return drills;
}
