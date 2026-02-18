import type Database from "better-sqlite3";
import type { WorkoutResult, MovementResult } from "../models/workout-result.js";
import type { ScoreType } from "../models/workout.js";

/**
 * Repository for persisting and querying workout results.
 */
export class ResultRepository {
  constructor(private db: Database.Database) {}

  /**
   * Insert a workout result.
   */
  save(result: WorkoutResult): void {
    this.db
      .prepare(
        `INSERT INTO workout_results
          (id, athlete_id, workout_id, performed_at, score_type,
           time_seconds, rounds_completed, partial_reps, peak_load,
           total_reps, total_calories, total_distance, rpe,
           rx, scaling_tier, movement_results_json, notes)
         VALUES
          (@id, @athleteId, @workoutId, @performedAt, @scoreType,
           @timeSeconds, @roundsCompleted, @partialReps, @peakLoad,
           @totalReps, @totalCalories, @totalDistance, @rpe,
           @rx, @scalingTier, @movementResultsJson, @notes)`
      )
      .run({
        id: result.id,
        athleteId: result.athleteId,
        workoutId: result.workoutId,
        performedAt: result.performedAt,
        scoreType: result.scoreType,
        timeSeconds: result.timeSeconds ?? null,
        roundsCompleted: result.roundsCompleted ?? null,
        partialReps: result.partialReps ?? null,
        peakLoad: result.peakLoad ?? null,
        totalReps: result.totalReps ?? null,
        totalCalories: result.totalCalories ?? null,
        totalDistance: result.totalDistance ?? null,
        rpe: result.rpe ?? null,
        rx: result.rx ? 1 : 0,
        scalingTier: result.scalingTier ?? null,
        movementResultsJson: JSON.stringify(result.movementResults),
        notes: result.notes ?? null,
      });
  }

  /**
   * Get a result by ID.
   */
  getById(id: string): WorkoutResult | null {
    const row = this.db
      .prepare("SELECT * FROM workout_results WHERE id = ?")
      .get(id) as any;
    return row ? this.rowToResult(row) : null;
  }

  /**
   * Get all results for an athlete, most recent first.
   */
  getByAthlete(athleteId: string, limit = 50): WorkoutResult[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM workout_results
         WHERE athlete_id = ?
         ORDER BY performed_at DESC
         LIMIT ?`
      )
      .all(athleteId, limit) as any[];
    return rows.map((r) => this.rowToResult(r));
  }

  /**
   * Get all results for a specific workout by a specific athlete.
   */
  getByAthleteAndWorkout(
    athleteId: string,
    workoutId: string
  ): WorkoutResult[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM workout_results
         WHERE athlete_id = ? AND workout_id = ?
         ORDER BY performed_at DESC`
      )
      .all(athleteId, workoutId) as any[];
    return rows.map((r) => this.rowToResult(r));
  }

  /**
   * Get results within a date range.
   */
  getByDateRange(
    athleteId: string,
    startDate: string,
    endDate: string
  ): WorkoutResult[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM workout_results
         WHERE athlete_id = ? AND performed_at >= ? AND performed_at <= ?
         ORDER BY performed_at DESC`
      )
      .all(athleteId, startDate, endDate) as any[];
    return rows.map((r) => this.rowToResult(r));
  }

  /**
   * Count total workouts for an athlete.
   */
  countByAthlete(athleteId: string): number {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) AS cnt FROM workout_results WHERE athlete_id = ?"
      )
      .get(athleteId) as any;
    return row.cnt;
  }

  /**
   * Delete a result by ID.
   */
  delete(id: string): boolean {
    const info = this.db
      .prepare("DELETE FROM workout_results WHERE id = ?")
      .run(id);
    return info.changes > 0;
  }

  private rowToResult(row: any): WorkoutResult {
    return {
      id: row.id,
      athleteId: row.athlete_id,
      workoutId: row.workout_id,
      performedAt: row.performed_at,
      scoreType: row.score_type as ScoreType,
      timeSeconds: row.time_seconds ?? undefined,
      roundsCompleted: row.rounds_completed ?? undefined,
      partialReps: row.partial_reps ?? undefined,
      peakLoad: row.peak_load ?? undefined,
      totalReps: row.total_reps ?? undefined,
      totalCalories: row.total_calories ?? undefined,
      totalDistance: row.total_distance ?? undefined,
      rpe: row.rpe ?? undefined,
      rx: row.rx === 1,
      scalingTier: row.scaling_tier ?? undefined,
      movementResults: JSON.parse(
        row.movement_results_json ?? "[]"
      ) as MovementResult[],
      notes: row.notes ?? undefined,
    };
  }
}
