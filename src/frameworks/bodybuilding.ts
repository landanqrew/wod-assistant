import type { TrainingSession, SessionBlock, Workout, MovementPrescription } from "../models/workout.js";
import {
  WorkoutFormat,
  ScoreType,
  SessionBlockType,
} from "../models/workout.js";
import { getMovement } from "../movements/library.js";

/**
 * Bodybuilding split types.
 */
export type SplitType = "ppl" | "upper_lower" | "full_body";

/**
 * A bodybuilding exercise prescription.
 */
interface BBExercise {
  movementId: string;
  sets: number;
  reps: string; // e.g., "8-12", "10", "12-15"
  notes?: string;
}

/**
 * A single day in a split.
 */
interface SplitDay {
  name: string;
  focus: string;
  exercises: BBExercise[];
  estimatedDuration: number;
}

// ─── Push / Pull / Legs (PPL) ────────────────────────────────────

const PPL_SPLIT: SplitDay[] = [
  {
    name: "Push Day",
    focus: "Chest, Shoulders, Triceps",
    estimatedDuration: 55,
    exercises: [
      { movementId: "bench_press", sets: 4, reps: "6-8", notes: "main compound" },
      { movementId: "strict_press", sets: 3, reps: "8-10" },
      { movementId: "dumbbell_bench_press", sets: 3, reps: "10-12", notes: "incline if possible" },
      { movementId: "dumbbell_press", sets: 3, reps: "10-12", notes: "lateral raises alt." },
      { movementId: "ring_dip", sets: 3, reps: "10-15", notes: "or bench dips" },
      { movementId: "push_up", sets: 2, reps: "to failure", notes: "burnout set" },
    ],
  },
  {
    name: "Pull Day",
    focus: "Back, Biceps",
    estimatedDuration: 55,
    exercises: [
      { movementId: "deadlift", sets: 4, reps: "5-6", notes: "main compound" },
      { movementId: "pull_up", sets: 4, reps: "6-10", notes: "weighted if possible" },
      { movementId: "dumbbell_row", sets: 3, reps: "8-12", notes: "each arm" },
      { movementId: "ring_row", sets: 3, reps: "10-15" },
      { movementId: "kettlebell_deadlift", sets: 3, reps: "12-15", notes: "RDL variation" },
      { movementId: "dumbbell_clean", sets: 2, reps: "10-12", notes: "bicep curl alt." },
    ],
  },
  {
    name: "Leg Day",
    focus: "Quads, Hamstrings, Glutes, Calves",
    estimatedDuration: 60,
    exercises: [
      { movementId: "back_squat", sets: 4, reps: "6-8", notes: "main compound" },
      { movementId: "front_squat", sets: 3, reps: "8-10" },
      { movementId: "walking_lunge", sets: 3, reps: "12 each leg" },
      { movementId: "kettlebell_deadlift", sets: 3, reps: "10-12", notes: "Romanian DL variation" },
      { movementId: "goblet_squat", sets: 3, reps: "12-15", notes: "pause at bottom" },
      { movementId: "box_step_up", sets: 3, reps: "10 each leg" },
    ],
  },
];

// ─── Upper / Lower Split ─────────────────────────────────────────

const UPPER_LOWER_SPLIT: SplitDay[] = [
  {
    name: "Upper Body A (Strength)",
    focus: "Horizontal Push/Pull emphasis",
    estimatedDuration: 55,
    exercises: [
      { movementId: "bench_press", sets: 4, reps: "5-6" },
      { movementId: "dumbbell_row", sets: 4, reps: "6-8", notes: "each arm" },
      { movementId: "strict_press", sets: 3, reps: "6-8" },
      { movementId: "pull_up", sets: 3, reps: "6-10" },
      { movementId: "dumbbell_bench_press", sets: 3, reps: "10-12" },
      { movementId: "ring_row", sets: 3, reps: "10-12" },
    ],
  },
  {
    name: "Lower Body A (Strength)",
    focus: "Squat emphasis",
    estimatedDuration: 55,
    exercises: [
      { movementId: "back_squat", sets: 4, reps: "5-6" },
      { movementId: "kettlebell_deadlift", sets: 3, reps: "8-10", notes: "Romanian DL variation" },
      { movementId: "walking_lunge", sets: 3, reps: "10 each leg" },
      { movementId: "goblet_squat", sets: 3, reps: "10-12" },
      { movementId: "sit_up", sets: 3, reps: "15-20", notes: "core work" },
      { movementId: "plank", sets: 3, reps: "30-45s", notes: "hold" },
    ],
  },
  {
    name: "Upper Body B (Hypertrophy)",
    focus: "Vertical Push/Pull emphasis",
    estimatedDuration: 55,
    exercises: [
      { movementId: "strict_press", sets: 4, reps: "8-10" },
      { movementId: "pull_up", sets: 4, reps: "8-12" },
      { movementId: "dumbbell_press", sets: 3, reps: "10-12" },
      { movementId: "dumbbell_row", sets: 3, reps: "10-12", notes: "each arm" },
      { movementId: "push_up", sets: 3, reps: "12-15" },
      { movementId: "ring_dip", sets: 3, reps: "10-15" },
    ],
  },
  {
    name: "Lower Body B (Hypertrophy)",
    focus: "Hinge emphasis",
    estimatedDuration: 55,
    exercises: [
      { movementId: "deadlift", sets: 4, reps: "5-6" },
      { movementId: "front_squat", sets: 3, reps: "8-10" },
      { movementId: "box_step_up", sets: 3, reps: "10 each leg" },
      { movementId: "lunge", sets: 3, reps: "12 each leg" },
      { movementId: "back_extension", sets: 3, reps: "12-15" },
      { movementId: "v_up", sets: 3, reps: "15", notes: "core work" },
    ],
  },
];

// ─── Full Body (3-day) ──────────────────────────────────────────

const FULL_BODY_SPLIT: SplitDay[] = [
  {
    name: "Full Body A",
    focus: "Squat + Horizontal Push/Pull",
    estimatedDuration: 55,
    exercises: [
      { movementId: "back_squat", sets: 4, reps: "6-8" },
      { movementId: "bench_press", sets: 4, reps: "6-8" },
      { movementId: "dumbbell_row", sets: 3, reps: "8-10", notes: "each arm" },
      { movementId: "walking_lunge", sets: 3, reps: "10 each leg" },
      { movementId: "plank", sets: 3, reps: "30-45s" },
    ],
  },
  {
    name: "Full Body B",
    focus: "Hinge + Vertical Push/Pull",
    estimatedDuration: 55,
    exercises: [
      { movementId: "deadlift", sets: 4, reps: "5-6" },
      { movementId: "strict_press", sets: 4, reps: "6-8" },
      { movementId: "pull_up", sets: 3, reps: "6-10" },
      { movementId: "goblet_squat", sets: 3, reps: "10-12" },
      { movementId: "sit_up", sets: 3, reps: "15-20" },
    ],
  },
  {
    name: "Full Body C",
    focus: "Front Squat + Accessories",
    estimatedDuration: 55,
    exercises: [
      { movementId: "front_squat", sets: 4, reps: "6-8" },
      { movementId: "dumbbell_bench_press", sets: 3, reps: "8-10" },
      { movementId: "ring_row", sets: 3, reps: "10-12" },
      { movementId: "kettlebell_swing", sets: 3, reps: "15" },
      { movementId: "push_up", sets: 3, reps: "12-15" },
      { movementId: "v_up", sets: 3, reps: "12-15" },
    ],
  },
];

const SPLIT_REGISTRY: Record<SplitType, SplitDay[]> = {
  ppl: PPL_SPLIT,
  upper_lower: UPPER_LOWER_SPLIT,
  full_body: FULL_BODY_SPLIT,
};

/**
 * Get all days in a split.
 */
export function getSplitDays(split: SplitType): SplitDay[] {
  return SPLIT_REGISTRY[split] ?? [];
}

/**
 * Generate a training session for a specific split day.
 */
export function generateSplitDay(
  split: SplitType,
  dayIndex: number
): TrainingSession {
  const days = getSplitDays(split);
  const day = days[dayIndex % days.length];

  const blocks: SessionBlock[] = [];

  // Warm-up
  blocks.push({
    type: SessionBlockType.WarmUp,
    durationMinutes: 8,
    notes: "5min cardio + dynamic stretches targeting today's muscle groups",
  });

  // Main workout
  const prescriptions: MovementPrescription[] = day.exercises.map((ex) => ({
    movementId: ex.movementId,
    movement: getMovement(ex.movementId),
    reps: parseInt(ex.reps) || 10,
    notes: `${ex.sets}x${ex.reps}${ex.notes ? ` (${ex.notes})` : ""}`,
  }));

  const workout: Workout = {
    id: `bb_${split}_d${dayIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: day.name,
    format: WorkoutFormat.Strength,
    movements: prescriptions,
    scoreType: ScoreType.None,
    isBenchmark: false,
    description: `${day.focus}\n${day.exercises.map((e) => `${e.sets}x${e.reps} ${getMovement(e.movementId)?.name ?? e.movementId}${e.notes ? ` (${e.notes})` : ""}`).join("\n")}`,
    estimatedDuration: day.estimatedDuration,
  };

  blocks.push({
    type: SessionBlockType.Strength,
    durationMinutes: day.estimatedDuration,
    workout,
  });

  // Cool-down
  blocks.push({
    type: SessionBlockType.CoolDown,
    durationMinutes: 5,
    notes: "Static stretching for worked muscle groups",
  });

  return {
    id: `session_bb_${split}_d${dayIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString().split("T")[0],
    blocks,
    totalDurationMinutes: blocks.reduce((s, b) => s + b.durationMinutes, 0),
    notes: `${day.name} - ${day.focus}`,
  };
}

/**
 * Info about available splits.
 */
export const SPLIT_INFO: Record<SplitType, { name: string; daysPerWeek: number; description: string }> = {
  ppl: {
    name: "Push / Pull / Legs",
    daysPerWeek: 6,
    description: "Classic PPL split. Run twice per week (Push, Pull, Legs, Push, Pull, Legs).",
  },
  upper_lower: {
    name: "Upper / Lower",
    daysPerWeek: 4,
    description: "4-day split alternating upper and lower body with strength and hypertrophy days.",
  },
  full_body: {
    name: "Full Body",
    daysPerWeek: 3,
    description: "3-day full body program. Great for beginners or those with limited gym time.",
  },
};
