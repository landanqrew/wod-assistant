import type Database from "better-sqlite3";
import type {
  WorkoutResult,
  PersonalRecord,
  PRCategory,
  PRUnit,
} from "../models/workout-result.js";
import { ScoreType } from "../models/workout.js";
import { PRRepository } from "../db/pr-repository.js";

/**
 * Detects new personal records from a workout result and persists them.
 */
export class PRTracker {
  private prRepo: PRRepository;

  constructor(private db: Database.Database) {
    this.prRepo = new PRRepository(db);
  }

  /**
   * Analyze a workout result for new PRs.
   * Returns the list of newly set PRs (already saved to the database).
   */
  detectAndSavePRs(result: WorkoutResult): PersonalRecord[] {
    const newPRs: PersonalRecord[] = [];

    // Check for workout-level PRs
    const workoutPRs = this.checkWorkoutPRs(result);
    newPRs.push(...workoutPRs);

    // Check for movement-level PRs (heaviest load per movement)
    const movementPRs = this.checkMovementPRs(result);
    newPRs.push(...movementPRs);

    // Save all new PRs
    for (const pr of newPRs) {
      this.prRepo.save(pr);
    }

    return newPRs;
  }

  /**
   * Get all PRs for an athlete.
   */
  getAllPRs(athleteId: string): PersonalRecord[] {
    return this.prRepo.getAllForAthlete(athleteId);
  }

  /**
   * Get PRs for a specific movement.
   */
  getMovementPRs(athleteId: string, movementId: string): PersonalRecord[] {
    return this.prRepo.getForReference(athleteId, movementId);
  }

  private checkWorkoutPRs(result: WorkoutResult): PersonalRecord[] {
    const prs: PersonalRecord[] = [];

    switch (result.scoreType) {
      case ScoreType.Time: {
        if (result.timeSeconds !== undefined) {
          const existing = this.prRepo.getCurrentTimePR(
            result.athleteId,
            result.workoutId,
            "fastest_time"
          );
          if (!existing || result.timeSeconds < existing.value) {
            prs.push(
              this.makePR(result, "workout", result.workoutId, "fastest_time",
                result.timeSeconds, "seconds", existing?.value)
            );
          }
        }
        break;
      }
      case ScoreType.RoundsAndReps: {
        if (result.roundsCompleted !== undefined) {
          // Encode as rounds * 1000 + partialReps for simple comparison
          const score =
            result.roundsCompleted * 1000 + (result.partialReps ?? 0);
          const existing = this.prRepo.getCurrentPR(
            result.athleteId,
            result.workoutId,
            "most_rounds"
          );
          if (!existing || score > existing.value) {
            prs.push(
              this.makePR(result, "workout", result.workoutId, "most_rounds",
                score, "rounds_reps", existing?.value)
            );
          }
        }
        break;
      }
      case ScoreType.Load: {
        if (result.peakLoad !== undefined) {
          const existing = this.prRepo.getCurrentPR(
            result.athleteId,
            result.workoutId,
            "heaviest_load"
          );
          if (!existing || result.peakLoad > existing.value) {
            prs.push(
              this.makePR(result, "workout", result.workoutId, "heaviest_load",
                result.peakLoad, "lbs", existing?.value)
            );
          }
        }
        break;
      }
      case ScoreType.Reps: {
        if (result.totalReps !== undefined) {
          const existing = this.prRepo.getCurrentPR(
            result.athleteId,
            result.workoutId,
            "max_reps"
          );
          if (!existing || result.totalReps > existing.value) {
            prs.push(
              this.makePR(result, "workout", result.workoutId, "max_reps",
                result.totalReps, "reps", existing?.value)
            );
          }
        }
        break;
      }
      case ScoreType.Calories: {
        if (result.totalCalories !== undefined) {
          const existing = this.prRepo.getCurrentPR(
            result.athleteId,
            result.workoutId,
            "max_reps"
          );
          if (!existing || result.totalCalories > existing.value) {
            prs.push(
              this.makePR(result, "workout", result.workoutId, "max_reps",
                result.totalCalories, "calories", existing?.value)
            );
          }
        }
        break;
      }
      case ScoreType.Distance: {
        if (result.totalDistance !== undefined) {
          const existing = this.prRepo.getCurrentPR(
            result.athleteId,
            result.workoutId,
            "max_reps"
          );
          if (!existing || result.totalDistance > existing.value) {
            prs.push(
              this.makePR(result, "workout", result.workoutId, "max_reps",
                result.totalDistance, "meters", existing?.value)
            );
          }
        }
        break;
      }
    }

    return prs;
  }

  private checkMovementPRs(result: WorkoutResult): PersonalRecord[] {
    const prs: PersonalRecord[] = [];

    for (const mr of result.movementResults) {
      if (mr.load !== undefined && mr.load > 0) {
        const existing = this.prRepo.getCurrentPR(
          result.athleteId,
          mr.movementId,
          "heaviest_load"
        );
        if (!existing || mr.load > existing.value) {
          prs.push(
            this.makePR(result, "movement", mr.movementId, "heaviest_load",
              mr.load, "lbs", existing?.value)
          );
        }
      }
    }

    return prs;
  }

  private makePR(
    result: WorkoutResult,
    refType: "movement" | "workout",
    refId: string,
    category: PRCategory,
    value: number,
    unit: PRUnit,
    previousValue?: number
  ): PersonalRecord {
    return {
      id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      athleteId: result.athleteId,
      referenceId: refId,
      referenceType: refType,
      category,
      value,
      unit,
      achievedAt: result.performedAt,
      workoutResultId: result.id,
      previousValue,
    };
  }
}
