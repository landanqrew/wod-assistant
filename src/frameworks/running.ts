import type { TrainingSession, SessionBlock } from "../models/workout.js";
import { SessionBlockType } from "../models/workout.js";

/**
 * Running plan types.
 */
export type RunPlanType = "couch_to_5k" | "5k_improvement" | "10k" | "half_marathon";

/**
 * A single running workout.
 */
export interface RunWorkout {
  type: "easy" | "tempo" | "interval" | "long" | "recovery" | "rest";
  description: string;
  durationMinutes: number;
  distanceKm?: number;
  pace?: string;
  intervals?: { work: string; rest: string; repeats: number };
}

/**
 * A week of running.
 */
export interface RunWeek {
  weekNumber: number;
  days: RunWorkout[];
  totalDistanceKm: number;
  notes?: string;
}

// ─── Couch to 5K (8-week plan) ──────────────────────────────────

const C25K_PLAN: RunWeek[] = [
  {
    weekNumber: 1,
    totalDistanceKm: 6,
    days: [
      { type: "interval", description: "Alternate 60s jog / 90s walk x8", durationMinutes: 20, intervals: { work: "60s jog", rest: "90s walk", repeats: 8 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "interval", description: "Alternate 60s jog / 90s walk x8", durationMinutes: 20, intervals: { work: "60s jog", rest: "90s walk", repeats: 8 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "interval", description: "Alternate 60s jog / 90s walk x8", durationMinutes: 20, intervals: { work: "60s jog", rest: "90s walk", repeats: 8 } },
      { type: "rest", description: "Rest or easy walk", durationMinutes: 0 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
    ],
  },
  {
    weekNumber: 2,
    totalDistanceKm: 7,
    days: [
      { type: "interval", description: "Alternate 90s jog / 2min walk x6", durationMinutes: 21, intervals: { work: "90s jog", rest: "2min walk", repeats: 6 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "interval", description: "Alternate 90s jog / 2min walk x6", durationMinutes: 21, intervals: { work: "90s jog", rest: "2min walk", repeats: 6 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "interval", description: "Alternate 90s jog / 2min walk x6", durationMinutes: 21, intervals: { work: "90s jog", rest: "2min walk", repeats: 6 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
    ],
  },
  {
    weekNumber: 3,
    totalDistanceKm: 8,
    days: [
      { type: "interval", description: "90s jog, 90s walk, 3min jog, 3min walk x2", durationMinutes: 22, intervals: { work: "3min jog", rest: "90s walk", repeats: 2 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "interval", description: "90s jog, 90s walk, 3min jog, 3min walk x2", durationMinutes: 22, intervals: { work: "3min jog", rest: "90s walk", repeats: 2 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "interval", description: "90s jog, 90s walk, 3min jog, 3min walk x2", durationMinutes: 22, intervals: { work: "3min jog", rest: "90s walk", repeats: 2 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
    ],
  },
  {
    weekNumber: 4,
    totalDistanceKm: 10,
    days: [
      { type: "interval", description: "3min jog, 90s walk, 5min jog, 2.5min walk x2", durationMinutes: 25, intervals: { work: "5min jog", rest: "2min walk", repeats: 2 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "interval", description: "3min jog, 90s walk, 5min jog, 2.5min walk x2", durationMinutes: 25, intervals: { work: "5min jog", rest: "2min walk", repeats: 2 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "interval", description: "3min jog, 90s walk, 5min jog, 2.5min walk x2", durationMinutes: 25, intervals: { work: "5min jog", rest: "2min walk", repeats: 2 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
    ],
  },
  {
    weekNumber: 5,
    totalDistanceKm: 12,
    days: [
      { type: "interval", description: "5min jog, 3min walk, 5min jog, 3min walk, 5min jog", durationMinutes: 25, intervals: { work: "5min jog", rest: "3min walk", repeats: 3 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "interval", description: "8min jog, 5min walk, 8min jog", durationMinutes: 25, intervals: { work: "8min jog", rest: "5min walk", repeats: 2 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "easy", description: "20 minutes continuous jog (milestone!)", durationMinutes: 20, distanceKm: 3 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
    ],
  },
  {
    weekNumber: 6,
    totalDistanceKm: 14,
    days: [
      { type: "interval", description: "5min jog, 3min walk, 8min jog, 3min walk, 5min jog", durationMinutes: 28, intervals: { work: "8min jog", rest: "3min walk", repeats: 2 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "easy", description: "22 minutes continuous jog", durationMinutes: 22, distanceKm: 3.5 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "easy", description: "25 minutes continuous jog", durationMinutes: 25, distanceKm: 4 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
    ],
  },
  {
    weekNumber: 7,
    totalDistanceKm: 16,
    days: [
      { type: "easy", description: "25 minutes continuous jog", durationMinutes: 25, distanceKm: 4 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "easy", description: "25 minutes continuous jog", durationMinutes: 25, distanceKm: 4 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "easy", description: "25 minutes continuous jog", durationMinutes: 25, distanceKm: 4 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
    ],
  },
  {
    weekNumber: 8,
    totalDistanceKm: 18,
    days: [
      { type: "easy", description: "28 minutes continuous jog", durationMinutes: 28, distanceKm: 4.5 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "easy", description: "28 minutes continuous jog", durationMinutes: 28, distanceKm: 4.5 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "long", description: "5K race or time trial!", durationMinutes: 35, distanceKm: 5, pace: "best effort" },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "rest", description: "Rest", durationMinutes: 0 },
    ],
  },
];

// ─── 5K Improvement (4-week block) ─────────────────────────────

const FIVE_K_PLAN: RunWeek[] = [
  {
    weekNumber: 1,
    totalDistanceKm: 25,
    days: [
      { type: "easy", description: "Easy run", durationMinutes: 30, distanceKm: 5, pace: "easy/conversational" },
      { type: "interval", description: "6x400m repeats", durationMinutes: 35, distanceKm: 6, intervals: { work: "400m hard", rest: "200m jog", repeats: 6 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "easy", description: "Easy run", durationMinutes: 30, distanceKm: 5, pace: "easy" },
      { type: "tempo", description: "Tempo run: 10min easy, 15min tempo, 5min easy", durationMinutes: 30, distanceKm: 5, pace: "tempo (comfortably hard)" },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "long", description: "Long run", durationMinutes: 45, distanceKm: 7, pace: "easy" },
    ],
  },
  {
    weekNumber: 2,
    totalDistanceKm: 28,
    days: [
      { type: "easy", description: "Easy run", durationMinutes: 30, distanceKm: 5, pace: "easy" },
      { type: "interval", description: "8x400m repeats", durationMinutes: 40, distanceKm: 7, intervals: { work: "400m hard", rest: "200m jog", repeats: 8 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "easy", description: "Easy run", durationMinutes: 30, distanceKm: 5, pace: "easy" },
      { type: "tempo", description: "Tempo: 10min easy, 20min tempo, 5min easy", durationMinutes: 35, distanceKm: 6, pace: "tempo" },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "long", description: "Long run", durationMinutes: 50, distanceKm: 8, pace: "easy" },
    ],
  },
  {
    weekNumber: 3,
    totalDistanceKm: 30,
    days: [
      { type: "easy", description: "Easy run", durationMinutes: 30, distanceKm: 5, pace: "easy" },
      { type: "interval", description: "5x800m repeats", durationMinutes: 40, distanceKm: 7, intervals: { work: "800m hard", rest: "400m jog", repeats: 5 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "easy", description: "Easy run", durationMinutes: 35, distanceKm: 6, pace: "easy" },
      { type: "tempo", description: "Tempo: 10min easy, 20min tempo, 5min easy", durationMinutes: 35, distanceKm: 6, pace: "tempo" },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "long", description: "Long run", durationMinutes: 55, distanceKm: 9, pace: "easy" },
    ],
  },
  {
    weekNumber: 4,
    totalDistanceKm: 20,
    notes: "Taper week",
    days: [
      { type: "easy", description: "Easy run", durationMinutes: 25, distanceKm: 4, pace: "easy" },
      { type: "interval", description: "4x400m (race pace)", durationMinutes: 25, distanceKm: 4, intervals: { work: "400m at goal pace", rest: "200m jog", repeats: 4 } },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "easy", description: "Shakeout jog", durationMinutes: 20, distanceKm: 3, pace: "very easy" },
      { type: "rest", description: "Rest", durationMinutes: 0 },
      { type: "easy", description: "5K race day!", durationMinutes: 30, distanceKm: 5, pace: "race effort" },
      { type: "rest", description: "Rest / celebrate", durationMinutes: 0 },
    ],
  },
];

/**
 * Get a run plan by type.
 */
export function getRunPlan(type: RunPlanType): RunWeek[] {
  switch (type) {
    case "couch_to_5k":
      return C25K_PLAN;
    case "5k_improvement":
      return FIVE_K_PLAN;
    default:
      return C25K_PLAN;
  }
}

/**
 * Get a specific week from a plan.
 */
export function getRunWeek(type: RunPlanType, week: number): RunWeek | undefined {
  const plan = getRunPlan(type);
  return plan.find((w) => w.weekNumber === week);
}

/**
 * Convert a running day to a TrainingSession.
 */
export function runWorkoutToSession(
  runWorkout: RunWorkout,
  weekNumber: number,
  dayIndex: number
): TrainingSession {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const blocks: SessionBlock[] = [];

  if (runWorkout.type === "rest") {
    blocks.push({
      type: SessionBlockType.CoolDown,
      durationMinutes: 0,
      notes: "Rest day - recover!",
    });
  } else {
    if (runWorkout.type !== "recovery") {
      blocks.push({
        type: SessionBlockType.WarmUp,
        durationMinutes: 5,
        notes: "5 min easy walk + dynamic stretches",
      });
    }

    let notes = runWorkout.description;
    if (runWorkout.distanceKm) notes += `\nDistance: ${runWorkout.distanceKm} km`;
    if (runWorkout.pace) notes += `\nPace: ${runWorkout.pace}`;
    if (runWorkout.intervals) {
      notes += `\n${runWorkout.intervals.repeats}x ${runWorkout.intervals.work} / ${runWorkout.intervals.rest}`;
    }

    blocks.push({
      type: SessionBlockType.Metcon,
      durationMinutes: runWorkout.durationMinutes,
      notes,
    });

    blocks.push({
      type: SessionBlockType.CoolDown,
      durationMinutes: 5,
      notes: "5 min easy walk + static stretches",
    });
  }

  return {
    id: `session_run_w${weekNumber}_d${dayIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString().split("T")[0],
    blocks,
    totalDurationMinutes: blocks.reduce((s, b) => s + b.durationMinutes, 0),
    notes: `Week ${weekNumber} ${dayNames[dayIndex]} - ${runWorkout.description}`,
  };
}

/**
 * Available run plan types with descriptions.
 */
export const RUN_PLAN_INFO: Record<RunPlanType, { name: string; weeks: number; description: string }> = {
  couch_to_5k: {
    name: "Couch to 5K",
    weeks: 8,
    description: "Beginner program: walk-to-run progression over 8 weeks",
  },
  "5k_improvement": {
    name: "5K Improvement",
    weeks: 4,
    description: "Intermediate: intervals, tempo, and long runs to get faster",
  },
  "10k": {
    name: "10K Plan",
    weeks: 6,
    description: "Build from 5K to 10K distance (coming soon)",
  },
  half_marathon: {
    name: "Half Marathon",
    weeks: 12,
    description: "12-week half marathon training plan (coming soon)",
  },
};
