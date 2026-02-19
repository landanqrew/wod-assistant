import type { TrainingSession, SessionBlock } from "../models/workout.js";
import {
  WorkoutFormat,
  ScoreType,
  SessionBlockType,
} from "../models/workout.js";
import type { Workout, MovementPrescription } from "../models/workout.js";
import { getMovement } from "../movements/library.js";

/**
 * 5/3/1 program configuration.
 */
export interface FiveThreeOneConfig {
  /** Training max in lbs for each lift */
  trainingMax: {
    squat: number;
    bench: number;
    deadlift: number;
    press: number;
  };
  /** Current week in the cycle (1-4). Week 4 is deload. */
  week: 1 | 2 | 3 | 4;
  /** Include Boring But Big accessory work (default: true) */
  includeBBB?: boolean;
}

/**
 * Linear progression configuration.
 */
export interface LinearProgressionConfig {
  /** Lifts and their current working weights */
  lifts: { movementId: string; weight: number }[];
  /** Sets x Reps scheme (default: 5x5) */
  sets?: number;
  reps?: number;
  /** Which day in the rotation (A or B for a simple A/B split) */
  day: "A" | "B";
}

/**
 * Weekly percentages for 5/3/1 (excluding deload).
 */
const FIVE_THREE_ONE_SCHEME: Record<
  1 | 2 | 3 | 4,
  { sets: { reps: number; percent: number }[]; amrapLast: boolean }
> = {
  1: {
    sets: [
      { reps: 5, percent: 0.65 },
      { reps: 5, percent: 0.75 },
      { reps: 5, percent: 0.85 },
    ],
    amrapLast: true,
  },
  2: {
    sets: [
      { reps: 3, percent: 0.7 },
      { reps: 3, percent: 0.8 },
      { reps: 3, percent: 0.9 },
    ],
    amrapLast: true,
  },
  3: {
    sets: [
      { reps: 5, percent: 0.75 },
      { reps: 3, percent: 0.85 },
      { reps: 1, percent: 0.95 },
    ],
    amrapLast: true,
  },
  4: {
    sets: [
      { reps: 5, percent: 0.4 },
      { reps: 5, percent: 0.5 },
      { reps: 5, percent: 0.6 },
    ],
    amrapLast: false,
  },
};

const FIVE_THREE_ONE_LIFTS = ["back_squat", "bench_press", "deadlift", "strict_press"] as const;

const BBB_ACCESSORY: Record<string, string[]> = {
  back_squat: ["lunge", "leg_curl", "ab_wheel"],
  bench_press: ["dumbbell_row", "dumbbell_bench_press", "push_up"],
  deadlift: ["back_extension", "dumbbell_row", "plank"],
  strict_press: ["pull_up", "dumbbell_press", "sit_up"],
};

/**
 * Generate a single 5/3/1 training day.
 */
export function generateFiveThreeOneDay(
  liftKey: keyof FiveThreeOneConfig["trainingMax"],
  config: FiveThreeOneConfig
): TrainingSession {
  const liftMap: Record<string, string> = {
    squat: "back_squat",
    bench: "bench_press",
    deadlift: "deadlift",
    press: "strict_press",
  };
  const movementId = liftMap[liftKey];
  const tm = config.trainingMax[liftKey];
  const scheme = FIVE_THREE_ONE_SCHEME[config.week];

  const weekLabel =
    config.week === 1 ? "5s" : config.week === 2 ? "3s" : config.week === 3 ? "5/3/1" : "Deload";

  // Main lift workout
  const mainPrescriptions: MovementPrescription[] = scheme.sets.map(
    (set, idx) => {
      const load = roundWeight(tm * set.percent);
      const isLast = idx === scheme.sets.length - 1;
      const notes =
        isLast && scheme.amrapLast
          ? `${set.reps}+ (AMRAP)`
          : `${set.reps} reps`;
      return {
        movementId,
        movement: getMovement(movementId),
        reps: set.reps,
        load,
        notes,
      };
    }
  );

  const mainWorkout: Workout = {
    id: `531_${liftKey}_w${config.week}_${Date.now()}`,
    name: `5/3/1 ${getMovement(movementId)?.name ?? movementId} - Week ${config.week} (${weekLabel})`,
    format: WorkoutFormat.Strength,
    movements: mainPrescriptions,
    scoreType: ScoreType.Load,
    isBenchmark: false,
    description: `5/3/1 ${weekLabel} week - ${getMovement(movementId)?.name}`,
    estimatedDuration: 20,
  };

  const blocks: SessionBlock[] = [
    {
      type: SessionBlockType.Strength,
      durationMinutes: 20,
      workout: mainWorkout,
      notes: scheme.sets
        .map((set, idx) => {
          const load = roundWeight(tm * set.percent);
          const isLast = idx === scheme.sets.length - 1;
          const label = isLast && scheme.amrapLast ? `${set.reps}+` : `${set.reps}`;
          return `Set ${idx + 1}: ${label} @ ${load} lbs (${Math.round(set.percent * 100)}%)`;
        })
        .join("\n"),
    },
  ];

  // BBB accessory work
  if (config.includeBBB !== false && config.week !== 4) {
    const bbbLoad = roundWeight(tm * 0.5);
    const bbbPrescription: MovementPrescription = {
      movementId,
      movement: getMovement(movementId),
      reps: 10,
      load: bbbLoad,
      notes: "5x10 @ 50% TM (Boring But Big)",
    };

    const bbbWorkout: Workout = {
      id: `bbb_${liftKey}_${Date.now()}`,
      name: `BBB ${getMovement(movementId)?.name} 5x10`,
      format: WorkoutFormat.Strength,
      movements: [bbbPrescription],
      rounds: 5,
      scoreType: ScoreType.None,
      isBenchmark: false,
      estimatedDuration: 15,
    };

    blocks.push({
      type: SessionBlockType.Accessory,
      durationMinutes: 15,
      workout: bbbWorkout,
      notes: `5x10 ${getMovement(movementId)?.name} @ ${bbbLoad} lbs`,
    });

    // Additional accessories
    const accessories = BBB_ACCESSORY[movementId] ?? [];
    if (accessories.length > 0) {
      const accNotes = accessories
        .map((id) => `3x10-15 ${getMovement(id)?.name ?? id}`)
        .join("\n");
      blocks.push({
        type: SessionBlockType.Accessory,
        durationMinutes: 10,
        notes: accNotes,
      });
    }
  }

  return {
    id: `session_531_${liftKey}_w${config.week}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString().split("T")[0],
    blocks,
    totalDurationMinutes: blocks.reduce((s, b) => s + b.durationMinutes, 0),
    notes: `5/3/1 ${weekLabel} - ${getMovement(movementId)?.name}`,
  };
}

/**
 * Generate a full 5/3/1 week (4 training days).
 */
export function generateFiveThreeOneWeek(
  config: FiveThreeOneConfig
): TrainingSession[] {
  const liftOrder: (keyof FiveThreeOneConfig["trainingMax"])[] = [
    "squat",
    "bench",
    "deadlift",
    "press",
  ];
  return liftOrder.map((lift) => generateFiveThreeOneDay(lift, config));
}

/**
 * Generate a linear progression training day (e.g., StrongLifts-style).
 */
export function generateLinearProgressionDay(
  config: LinearProgressionConfig
): TrainingSession {
  const sets = config.sets ?? 5;
  const reps = config.reps ?? 5;

  const blocks: SessionBlock[] = [];

  for (const lift of config.lifts) {
    const movement = getMovement(lift.movementId);
    const prescription: MovementPrescription = {
      movementId: lift.movementId,
      movement,
      reps,
      load: lift.weight,
      notes: `${sets}x${reps} @ ${lift.weight} lbs`,
    };

    const workout: Workout = {
      id: `lp_${lift.movementId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: `${sets}x${reps} ${movement?.name ?? lift.movementId}`,
      format: WorkoutFormat.Strength,
      movements: [prescription],
      rounds: sets,
      scoreType: ScoreType.Load,
      isBenchmark: false,
      estimatedDuration: 15,
    };

    blocks.push({
      type: SessionBlockType.Strength,
      durationMinutes: 15,
      workout,
      notes: `${sets}x${reps} @ ${lift.weight} lbs`,
    });
  }

  const dayLabel = config.day === "A" ? "Day A" : "Day B";

  return {
    id: `session_lp_${config.day}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString().split("T")[0],
    blocks,
    totalDurationMinutes: blocks.reduce((s, b) => s + b.durationMinutes, 0),
    notes: `Linear Progression ${dayLabel}`,
  };
}

/**
 * Preset linear progression A/B split (similar to StrongLifts 5x5).
 */
export function generateStrongLiftsDay(
  day: "A" | "B",
  weights: { squat: number; bench: number; row: number; press: number; deadlift: number }
): TrainingSession {
  const dayA: LinearProgressionConfig = {
    lifts: [
      { movementId: "back_squat", weight: weights.squat },
      { movementId: "bench_press", weight: weights.bench },
      { movementId: "dumbbell_row", weight: weights.row },
    ],
    day: "A",
  };

  const dayB: LinearProgressionConfig = {
    lifts: [
      { movementId: "back_squat", weight: weights.squat },
      { movementId: "strict_press", weight: weights.press },
      { movementId: "deadlift", weight: weights.deadlift },
    ],
    sets: 5,
    reps: 5,
    day: "B",
  };

  return generateLinearProgressionDay(day === "A" ? dayA : dayB);
}

function roundWeight(weight: number): number {
  return Math.round(weight / 5) * 5;
}
