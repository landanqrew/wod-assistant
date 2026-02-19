import type { Workout, MovementPrescription } from "../models/workout.js";
import { WorkoutFormat, ScoreType } from "../models/workout.js";
import { getMovement } from "../movements/library.js";

/**
 * Benchmark WOD categories.
 */
export type BenchmarkCategory = "girl" | "hero" | "open" | "custom";

/**
 * Extended benchmark workout with category metadata.
 */
export interface BenchmarkWorkout extends Workout {
  category: BenchmarkCategory;
}

/**
 * Create a benchmark workout definition.
 */
function benchmark(
  id: string,
  name: string,
  category: BenchmarkCategory,
  format: WorkoutFormat,
  scoreType: ScoreType,
  movements: MovementPrescription[],
  opts: Partial<
    Pick<
      Workout,
      | "timeCap"
      | "rounds"
      | "workInterval"
      | "restInterval"
      | "emomMinutes"
      | "description"
      | "estimatedDuration"
    >
  > = {}
): BenchmarkWorkout {
  return {
    id: `benchmark_${id}`,
    name,
    format,
    movements,
    scoreType,
    isBenchmark: true,
    category,
    ...opts,
  };
}

function rx(
  movementId: string,
  opts: Omit<MovementPrescription, "movementId" | "movement"> = {}
): MovementPrescription {
  return { movementId, movement: getMovement(movementId), ...opts };
}

// ─── THE GIRLS ────────────────────────────────────────────────────────────

export const BENCHMARK_LIBRARY: BenchmarkWorkout[] = [
  // --- Fran ---
  benchmark(
    "fran",
    "Fran",
    "girl",
    WorkoutFormat.ForTime,
    ScoreType.Time,
    [
      rx("thruster", { reps: 21, load: 95, notes: "21-15-9" }),
      rx("pull_up", { reps: 21, notes: "21-15-9" }),
    ],
    {
      description: "21-15-9 reps of Thrusters (95/65 lbs) and Pull-ups",
      estimatedDuration: 8,
    }
  ),

  // --- Grace ---
  benchmark(
    "grace",
    "Grace",
    "girl",
    WorkoutFormat.ForTime,
    ScoreType.Time,
    [rx("clean_and_jerk", { reps: 30, load: 135 })],
    {
      description: "30 Clean & Jerks for time (135/95 lbs)",
      estimatedDuration: 8,
    }
  ),

  // --- Helen ---
  benchmark(
    "helen",
    "Helen",
    "girl",
    WorkoutFormat.RoundsForTime,
    ScoreType.Time,
    [
      rx("run", { distance: 400 }),
      rx("kettlebell_swing", { reps: 21, load: 53 }),
      rx("pull_up", { reps: 12 }),
    ],
    {
      rounds: 3,
      description: "3 rounds: 400m Run, 21 KB Swings (53/35 lbs), 12 Pull-ups",
      estimatedDuration: 12,
    }
  ),

  // --- Diane ---
  benchmark(
    "diane",
    "Diane",
    "girl",
    WorkoutFormat.ForTime,
    ScoreType.Time,
    [
      rx("deadlift", { reps: 21, load: 225, notes: "21-15-9" }),
      rx("handstand_push_up", { reps: 21, notes: "21-15-9" }),
    ],
    {
      description: "21-15-9 reps of Deadlifts (225/155 lbs) and Handstand Push-ups",
      estimatedDuration: 10,
    }
  ),

  // --- Elizabeth ---
  benchmark(
    "elizabeth",
    "Elizabeth",
    "girl",
    WorkoutFormat.ForTime,
    ScoreType.Time,
    [
      rx("clean", { reps: 21, load: 135, notes: "21-15-9" }),
      rx("ring_dip", { reps: 21, notes: "21-15-9" }),
    ],
    {
      description: "21-15-9 reps of Cleans (135/95 lbs) and Ring Dips",
      estimatedDuration: 10,
    }
  ),

  // --- Isabel ---
  benchmark(
    "isabel",
    "Isabel",
    "girl",
    WorkoutFormat.ForTime,
    ScoreType.Time,
    [rx("snatch", { reps: 30, load: 135 })],
    {
      description: "30 Snatches for time (135/95 lbs)",
      estimatedDuration: 8,
    }
  ),

  // --- Jackie ---
  benchmark(
    "jackie",
    "Jackie",
    "girl",
    WorkoutFormat.ForTime,
    ScoreType.Time,
    [
      rx("row", { calories: 0, distance: 1000 }),
      rx("thruster", { reps: 50, load: 45 }),
      rx("pull_up", { reps: 30 }),
    ],
    {
      description: "1000m Row, 50 Thrusters (45 lbs), 30 Pull-ups",
      estimatedDuration: 12,
    }
  ),

  // --- Karen ---
  benchmark(
    "karen",
    "Karen",
    "girl",
    WorkoutFormat.ForTime,
    ScoreType.Time,
    [rx("wall_ball_shot", { reps: 150, load: 20 })],
    {
      description: "150 Wall Ball Shots for time (20/14 lbs)",
      estimatedDuration: 12,
    }
  ),

  // --- Nancy ---
  benchmark(
    "nancy",
    "Nancy",
    "girl",
    WorkoutFormat.RoundsForTime,
    ScoreType.Time,
    [
      rx("run", { distance: 400 }),
      rx("overhead_squat", { reps: 15, load: 95 }),
    ],
    {
      rounds: 5,
      description: "5 rounds: 400m Run, 15 Overhead Squats (95/65 lbs)",
      estimatedDuration: 20,
    }
  ),

  // --- Cindy ---
  benchmark(
    "cindy",
    "Cindy",
    "girl",
    WorkoutFormat.AMRAP,
    ScoreType.RoundsAndReps,
    [
      rx("pull_up", { reps: 5 }),
      rx("push_up", { reps: 10 }),
      rx("air_squat", { reps: 15 }),
    ],
    {
      timeCap: 20,
      description: "20-minute AMRAP: 5 Pull-ups, 10 Push-ups, 15 Air Squats",
      estimatedDuration: 20,
    }
  ),

  // --- Annie ---
  benchmark(
    "annie",
    "Annie",
    "girl",
    WorkoutFormat.ForTime,
    ScoreType.Time,
    [
      rx("double_under", { reps: 50, notes: "50-40-30-20-10" }),
      rx("sit_up", { reps: 50, notes: "50-40-30-20-10" }),
    ],
    {
      description: "50-40-30-20-10 reps of Double Unders and Sit-ups",
      estimatedDuration: 12,
    }
  ),

  // ─── HERO WODS ─────────────────────────────────────────────────────────

  // --- Murph ---
  benchmark(
    "murph",
    "Murph",
    "hero",
    WorkoutFormat.ForTime,
    ScoreType.Time,
    [
      rx("run", { distance: 1600 }),
      rx("pull_up", { reps: 100 }),
      rx("push_up", { reps: 200 }),
      rx("air_squat", { reps: 300 }),
      rx("run", { distance: 1600, notes: "Finish with 1-mile run" }),
    ],
    {
      description:
        "1-mile Run, 100 Pull-ups, 200 Push-ups, 300 Air Squats, 1-mile Run (wear a 20/14 lb vest)",
      estimatedDuration: 45,
    }
  ),

  // --- DT ---
  benchmark(
    "dt",
    "DT",
    "hero",
    WorkoutFormat.RoundsForTime,
    ScoreType.Time,
    [
      rx("deadlift", { reps: 12, load: 155 }),
      rx("hang_power_clean", { reps: 9, load: 155 }),
      rx("push_jerk", { reps: 6, load: 155 }),
    ],
    {
      rounds: 5,
      description:
        "5 rounds: 12 Deadlifts, 9 Hang Power Cleans, 6 Push Jerks (155/105 lbs)",
      estimatedDuration: 15,
    }
  ),

  // --- Filthy Fifty ---
  benchmark(
    "filthy_fifty",
    "Filthy Fifty",
    "hero",
    WorkoutFormat.ForTime,
    ScoreType.Time,
    [
      rx("box_jump", { reps: 50, notes: '24" box' }),
      rx("pull_up", { reps: 50, notes: "jumping" }),
      rx("kettlebell_swing", { reps: 50, load: 35 }),
      rx("walking_lunge", { reps: 50 }),
      rx("knees_to_elbow", { reps: 50 }),
      rx("push_press", { reps: 50, load: 45 }),
      rx("back_extension", { reps: 50 }),
      rx("wall_ball_shot", { reps: 50, load: 20 }),
      rx("burpee", { reps: 50 }),
      rx("double_under", { reps: 50 }),
    ],
    {
      description:
        "50 reps of each: Box Jumps, Pull-ups, KB Swings, Walking Lunges, K2E, Push Press, Back Extensions, Wall Balls, Burpees, Double Unders",
      estimatedDuration: 30,
    }
  ),

  // --- Badger ---
  benchmark(
    "badger",
    "Badger",
    "hero",
    WorkoutFormat.RoundsForTime,
    ScoreType.Time,
    [
      rx("clean", { reps: 30, load: 95 }),
      rx("pull_up", { reps: 30 }),
      rx("run", { distance: 800 }),
    ],
    {
      rounds: 3,
      description: "3 rounds: 30 Cleans (95/65 lbs), 30 Pull-ups, 800m Run",
      estimatedDuration: 25,
    }
  ),

  // ─── OPEN / CLASSIC BENCHMARKS ──────────────────────────────────────

  // --- Fight Gone Bad ---
  benchmark(
    "fight_gone_bad",
    "Fight Gone Bad",
    "open",
    WorkoutFormat.Interval,
    ScoreType.Reps,
    [
      rx("wall_ball_shot", { reps: 0, load: 20, duration: 60 }),
      rx("sumo_deadlift_high_pull", { reps: 0, load: 75, duration: 60 }),
      rx("box_jump", { reps: 0, duration: 60, notes: '20" box' }),
      rx("push_press", { reps: 0, load: 75, duration: 60 }),
      rx("row", { calories: 0, duration: 60 }),
    ],
    {
      rounds: 3,
      workInterval: 60,
      restInterval: 60,
      description:
        "3 rounds of 5 exercises, 1 min each, 1 min rest between rounds. Score = total reps.",
      estimatedDuration: 20,
    }
  ),

  // --- Kalsu ---
  benchmark(
    "kalsu",
    "Kalsu",
    "hero",
    WorkoutFormat.ForTime,
    ScoreType.Time,
    [
      rx("thruster", { reps: 100, load: 135 }),
      rx("burpee", { reps: 5, notes: "5 burpees at the top of every minute" }),
    ],
    {
      description:
        "100 Thrusters (135/95 lbs) for time. At the top of every minute, perform 5 Burpees.",
      estimatedDuration: 25,
    }
  ),
];

// ─── Lookup functions ─────────────────────────────────────────────────────

const benchmarkIndex = new Map<string, BenchmarkWorkout>();
for (const b of BENCHMARK_LIBRARY) {
  // Index by the short name (lowercase) and by id
  benchmarkIndex.set(b.name.toLowerCase(), b);
  benchmarkIndex.set(b.id, b);
}

/**
 * Get a benchmark workout by name (case-insensitive) or by ID.
 */
export function getBenchmark(nameOrId: string): BenchmarkWorkout | undefined {
  return benchmarkIndex.get(nameOrId.toLowerCase());
}

/**
 * Get all benchmark workouts.
 */
export function getAllBenchmarks(): BenchmarkWorkout[] {
  return [...BENCHMARK_LIBRARY];
}

/**
 * Get benchmarks by category.
 */
export function getBenchmarksByCategory(
  category: BenchmarkCategory
): BenchmarkWorkout[] {
  return BENCHMARK_LIBRARY.filter((b) => b.category === category);
}

/**
 * Search benchmarks by name (partial, case-insensitive).
 */
export function searchBenchmarks(query: string): BenchmarkWorkout[] {
  const q = query.toLowerCase();
  return BENCHMARK_LIBRARY.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      (b.description?.toLowerCase().includes(q) ?? false)
  );
}
