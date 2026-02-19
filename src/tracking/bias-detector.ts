import type Database from "better-sqlite3";
import type { WorkoutResult } from "../models/workout-result.js";
import type { Workout } from "../models/workout.js";
import { Modality, MuscleGroup } from "../models/body.js";
import { getMovement } from "../movements/library.js";
import { ResultRepository } from "../db/result-repository.js";
import { WorkoutRepository } from "../db/workout-repository.js";

/**
 * A single bias insight with severity and recommendation.
 */
export interface BiasInsight {
  category: "modality" | "muscle_group" | "movement" | "format" | "frequency";
  severity: "info" | "warning" | "alert";
  message: string;
  recommendation: string;
}

/**
 * Full bias report for an athlete's training.
 */
export interface BiasReport {
  /** Period analyzed */
  periodDays: number;
  totalWorkouts: number;
  insights: BiasInsight[];
  /** Distribution of modalities as percentages */
  modalityDistribution: Record<string, number>;
  /** Distribution of muscle groups as percentages */
  muscleGroupDistribution: Record<string, number>;
  /** Movements sorted by frequency (most used first) */
  movementFrequency: { movementId: string; name: string; count: number }[];
  /** Workout format distribution */
  formatDistribution: Record<string, number>;
}

/**
 * Analyzes training history for programming biases and gaps.
 */
export class BiasDetector {
  private resultRepo: ResultRepository;
  private workoutRepo: WorkoutRepository;

  constructor(db: Database.Database) {
    this.resultRepo = new ResultRepository(db);
    this.workoutRepo = new WorkoutRepository(db);
  }

  /**
   * Analyze an athlete's training over a period for biases.
   */
  analyze(athleteId: string, periodDays: number = 30): BiasReport {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - periodDays);

    const results = this.resultRepo.getByDateRange(
      athleteId,
      start.toISOString(),
      end.toISOString()
    );

    const insights: BiasInsight[] = [];

    // Collect all movement IDs and resolve metadata
    const modalityCounts = new Map<string, number>();
    const muscleGroupCounts = new Map<string, number>();
    const movementCounts = new Map<string, number>();
    const formatCounts = new Map<string, number>();

    for (const result of results) {
      // Count workout format
      const workout = this.workoutRepo.getById(result.workoutId);
      if (workout) {
        formatCounts.set(
          workout.format,
          (formatCounts.get(workout.format) ?? 0) + 1
        );
      }

      // Count movements, modalities, and muscle groups
      for (const mr of result.movementResults) {
        movementCounts.set(
          mr.movementId,
          (movementCounts.get(mr.movementId) ?? 0) + 1
        );

        const movement = getMovement(mr.movementId);
        if (movement) {
          modalityCounts.set(
            movement.modality,
            (modalityCounts.get(movement.modality) ?? 0) + 1
          );
          for (const mg of movement.muscleGroups) {
            muscleGroupCounts.set(mg, (muscleGroupCounts.get(mg) ?? 0) + 1);
          }
        }
      }
    }

    // Build distributions
    const modalityTotal = sumValues(modalityCounts);
    const modalityDistribution: Record<string, number> = {};
    for (const mod of Object.values(Modality)) {
      modalityDistribution[mod] = modalityTotal > 0
        ? Math.round(((modalityCounts.get(mod) ?? 0) / modalityTotal) * 100)
        : 0;
    }

    const muscleGroupTotal = sumValues(muscleGroupCounts);
    const muscleGroupDistribution: Record<string, number> = {};
    for (const mg of Object.values(MuscleGroup)) {
      muscleGroupDistribution[mg] = muscleGroupTotal > 0
        ? Math.round(((muscleGroupCounts.get(mg) ?? 0) / muscleGroupTotal) * 100)
        : 0;
    }

    const formatDistribution: Record<string, number> = {};
    for (const [fmt, count] of formatCounts) {
      formatDistribution[fmt] = results.length > 0
        ? Math.round((count / results.length) * 100)
        : 0;
    }

    const movementFrequency = [...movementCounts.entries()]
      .map(([id, count]) => ({
        movementId: id,
        name: getMovement(id)?.name ?? id,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Generate insights only if there's enough data
    if (results.length >= 3) {
      insights.push(...this.detectModalityBias(modalityCounts, modalityTotal, periodDays));
      insights.push(...this.detectMuscleGroupBias(muscleGroupCounts, muscleGroupTotal, periodDays));
      insights.push(...this.detectMovementBias(movementCounts, results.length));
      insights.push(...this.detectFormatBias(formatCounts, results.length));
      insights.push(...this.detectFrequencyPatterns(results, periodDays));
    } else if (results.length > 0) {
      insights.push({
        category: "frequency",
        severity: "info",
        message: `Only ${results.length} workout(s) in the last ${periodDays} days`,
        recommendation: "Log more workouts for meaningful bias analysis.",
      });
    }

    return {
      periodDays,
      totalWorkouts: results.length,
      insights,
      modalityDistribution,
      muscleGroupDistribution,
      movementFrequency,
      formatDistribution,
    };
  }

  private detectModalityBias(
    counts: Map<string, number>,
    total: number,
    periodDays: number
  ): BiasInsight[] {
    const insights: BiasInsight[] = [];
    if (total === 0) return insights;

    const allModalities = Object.values(Modality);

    // Check for missing modalities
    for (const mod of allModalities) {
      const count = counts.get(mod) ?? 0;
      const pct = (count / total) * 100;

      if (count === 0) {
        insights.push({
          category: "modality",
          severity: periodDays >= 14 ? "alert" : "warning",
          message: `No ${mod} movements in the last ${periodDays} days`,
          recommendation: `Add ${mod} work to your programming for balanced fitness.`,
        });
      } else if (pct > 60) {
        insights.push({
          category: "modality",
          severity: "warning",
          message: `${Math.round(pct)}% of movements are ${mod} (${count}/${total})`,
          recommendation: `Consider adding more variety outside of ${mod}.`,
        });
      }
    }

    return insights;
  }

  private detectMuscleGroupBias(
    counts: Map<string, number>,
    total: number,
    periodDays: number
  ): BiasInsight[] {
    const insights: BiasInsight[] = [];
    if (total === 0) return insights;

    const allGroups = Object.values(MuscleGroup);
    const groupLabels: Record<string, string> = {
      push: "pushing (press, push-up, dip)",
      pull: "pulling (pull-up, row, clean)",
      squat: "squatting (squat, lunge)",
      hinge: "hinging (deadlift, swing, snatch)",
      core: "core (sit-up, plank, T2B)",
      carry: "carrying (farmer's carry, sandbag)",
    };

    for (const mg of allGroups) {
      const count = counts.get(mg) ?? 0;
      const pct = (count / total) * 100;

      if (count === 0 && periodDays >= 14) {
        insights.push({
          category: "muscle_group",
          severity: "alert",
          message: `No ${groupLabels[mg] ?? mg} in the last ${periodDays} days`,
          recommendation: `Include ${mg} movements in upcoming workouts.`,
        });
      } else if (pct > 40 && total >= 10) {
        insights.push({
          category: "muscle_group",
          severity: "warning",
          message: `${Math.round(pct)}% of volume is ${mg} movements`,
          recommendation: `Balance your programming with more variety across muscle groups.`,
        });
      }
    }

    // Check push/pull balance
    const pushCount = counts.get(MuscleGroup.Push) ?? 0;
    const pullCount = counts.get(MuscleGroup.Pull) ?? 0;
    if (pushCount > 0 && pullCount > 0) {
      const ratio = pushCount / pullCount;
      if (ratio > 2) {
        insights.push({
          category: "muscle_group",
          severity: "warning",
          message: `Push-to-pull ratio is ${ratio.toFixed(1)}:1 (${pushCount} push vs ${pullCount} pull)`,
          recommendation: "Add more pulling movements (rows, pull-ups, cleans) for shoulder health.",
        });
      } else if (ratio < 0.5) {
        insights.push({
          category: "muscle_group",
          severity: "info",
          message: `Pull-to-push ratio is ${(1/ratio).toFixed(1)}:1 (${pullCount} pull vs ${pushCount} push)`,
          recommendation: "Consider adding more pressing movements for balance.",
        });
      }
    }

    return insights;
  }

  private detectMovementBias(
    counts: Map<string, number>,
    totalWorkouts: number
  ): BiasInsight[] {
    const insights: BiasInsight[] = [];

    // Check for over-reliance on specific movements
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    if (sorted.length > 0 && totalWorkouts >= 5) {
      const topMovement = sorted[0];
      const topPct = (topMovement[1] / totalWorkouts) * 100;
      const name = getMovement(topMovement[0])?.name ?? topMovement[0];

      if (topPct > 70) {
        insights.push({
          category: "movement",
          severity: "warning",
          message: `${name} appears in ${Math.round(topPct)}% of workouts (${topMovement[1]}/${totalWorkouts})`,
          recommendation: `Rotate in substitutions to reduce overuse risk.`,
        });
      }
    }

    return insights;
  }

  private detectFormatBias(
    counts: Map<string, number>,
    totalWorkouts: number
  ): BiasInsight[] {
    const insights: BiasInsight[] = [];
    if (totalWorkouts < 5) return insights;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    // Check if one format dominates
    if (sorted.length > 0) {
      const topFormat = sorted[0];
      const topPct = (topFormat[1] / totalWorkouts) * 100;

      if (topPct > 80) {
        insights.push({
          category: "format",
          severity: "warning",
          message: `${Math.round(topPct)}% of workouts are ${topFormat[0].replace(/_/g, " ")}`,
          recommendation: "Mix in different formats to develop well-rounded fitness.",
        });
      }
    }

    // Check if strength is missing
    const hasStrength = counts.has("strength");
    if (!hasStrength && totalWorkouts >= 5) {
      insights.push({
        category: "format",
        severity: "info",
        message: "No dedicated strength sessions in this period",
        recommendation: "Consider adding strength work (back squat, deadlift, press) for long-term gains.",
      });
    }

    return insights;
  }

  private detectFrequencyPatterns(
    results: WorkoutResult[],
    periodDays: number
  ): BiasInsight[] {
    const insights: BiasInsight[] = [];

    const avgPerWeek = (results.length / periodDays) * 7;

    if (avgPerWeek < 2 && periodDays >= 14) {
      insights.push({
        category: "frequency",
        severity: "warning",
        message: `Averaging ${avgPerWeek.toFixed(1)} workouts/week over ${periodDays} days`,
        recommendation: "Aim for 3-5 sessions per week for consistent progress.",
      });
    } else if (avgPerWeek > 7) {
      insights.push({
        category: "frequency",
        severity: "alert",
        message: `Averaging ${avgPerWeek.toFixed(1)} workouts/week — that's more than once per day`,
        recommendation: "Ensure adequate recovery. Rest days are when you get stronger.",
      });
    }

    // Check for long gaps
    if (results.length >= 2) {
      const dates = results
        .map((r) => new Date(r.performedAt).getTime())
        .sort((a, b) => a - b);

      let maxGapDays = 0;
      for (let i = 1; i < dates.length; i++) {
        const gapDays = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
        maxGapDays = Math.max(maxGapDays, gapDays);
      }

      if (maxGapDays > 7) {
        insights.push({
          category: "frequency",
          severity: "info",
          message: `Longest gap between workouts: ${Math.round(maxGapDays)} days`,
          recommendation: "Try to maintain consistency. Even light sessions help maintain fitness.",
        });
      }
    }

    return insights;
  }
}

function sumValues(map: Map<string, number>): number {
  let sum = 0;
  for (const v of map.values()) sum += v;
  return sum;
}
