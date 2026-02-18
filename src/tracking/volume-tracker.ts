import type { WorkoutResult, MovementResult } from "../models/workout-result.js";
import { ResultRepository } from "../db/result-repository.js";
import type Database from "better-sqlite3";

/**
 * Summary of training volume for a period.
 */
export interface VolumeSummary {
  /** Date range covered */
  startDate: string;
  endDate: string;
  /** Total number of workouts logged */
  totalWorkouts: number;
  /** Number of Rx workouts */
  rxWorkouts: number;
  /** Total training load (sum of all load * reps across all movements) */
  totalVolumeLbs: number;
  /** Average RPE across all workouts (where reported) */
  averageRpe: number | null;
  /** Breakdown by movement ID */
  movementBreakdown: MovementVolume[];
  /** Workouts per day of week (0=Sunday) */
  dayDistribution: number[];
}

/**
 * Volume data for a single movement across the period.
 */
export interface MovementVolume {
  movementId: string;
  /** Total sets this movement appeared in */
  totalSets: number;
  /** Total reps across all workouts */
  totalReps: number;
  /** Heaviest load used */
  maxLoad: number;
  /** Average load used (where applicable) */
  averageLoad: number | null;
}

/**
 * Computes training volume and intensity summaries from workout results.
 */
export class VolumeTracker {
  private resultRepo: ResultRepository;

  constructor(db: Database.Database) {
    this.resultRepo = new ResultRepository(db);
  }

  /**
   * Compute a volume summary for an athlete over a date range.
   */
  summarize(
    athleteId: string,
    startDate: string,
    endDate: string
  ): VolumeSummary {
    const results = this.resultRepo.getByDateRange(
      athleteId,
      startDate,
      endDate
    );

    const movementMap = new Map<string, {
      totalSets: number;
      totalReps: number;
      maxLoad: number;
      loads: number[];
    }>();

    let totalVolumeLbs = 0;
    const rpeValues: number[] = [];
    let rxCount = 0;
    const dayDistribution = new Array(7).fill(0);

    for (const result of results) {
      if (result.rx) rxCount++;
      if (result.rpe !== undefined) rpeValues.push(result.rpe);

      // Day of week
      const date = new Date(result.performedAt);
      dayDistribution[date.getUTCDay()]++;

      // Process movement results
      for (const mr of result.movementResults) {
        const existing = movementMap.get(mr.movementId) ?? {
          totalSets: 0,
          totalReps: 0,
          maxLoad: 0,
          loads: [],
        };

        existing.totalSets++;
        existing.totalReps += mr.reps ?? 0;

        if (mr.load !== undefined && mr.load > 0) {
          existing.maxLoad = Math.max(existing.maxLoad, mr.load);
          existing.loads.push(mr.load);
          totalVolumeLbs += mr.load * (mr.reps ?? 1);
        }

        movementMap.set(mr.movementId, existing);
      }
    }

    const movementBreakdown: MovementVolume[] = [];
    for (const [movementId, data] of movementMap) {
      movementBreakdown.push({
        movementId,
        totalSets: data.totalSets,
        totalReps: data.totalReps,
        maxLoad: data.maxLoad,
        averageLoad:
          data.loads.length > 0
            ? Math.round(
                data.loads.reduce((a, b) => a + b, 0) / data.loads.length
              )
            : null,
      });
    }

    // Sort by total reps descending (most-used movements first)
    movementBreakdown.sort((a, b) => b.totalReps - a.totalReps);

    return {
      startDate,
      endDate,
      totalWorkouts: results.length,
      rxWorkouts: rxCount,
      totalVolumeLbs,
      averageRpe:
        rpeValues.length > 0
          ? Math.round(
              (rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10
            ) / 10
          : null,
      movementBreakdown,
      dayDistribution,
    };
  }

  /**
   * Convenience: summarize the last 7 days.
   */
  weekSummary(athleteId: string): VolumeSummary {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return this.summarize(
      athleteId,
      start.toISOString(),
      end.toISOString()
    );
  }

  /**
   * Convenience: summarize the last 30 days.
   */
  monthSummary(athleteId: string): VolumeSummary {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    return this.summarize(
      athleteId,
      start.toISOString(),
      end.toISOString()
    );
  }
}
