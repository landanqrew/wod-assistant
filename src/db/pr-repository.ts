import type Database from "better-sqlite3";
import type {
  PersonalRecord,
  PRCategory,
  PRUnit,
} from "../models/workout-result.js";

/**
 * Repository for persisting and querying personal records.
 */
export class PRRepository {
  constructor(private db: Database.Database) {}

  /**
   * Insert a personal record.
   */
  save(pr: PersonalRecord): void {
    this.db
      .prepare(
        `INSERT INTO personal_records
          (id, athlete_id, reference_id, reference_type, category,
           value, unit, achieved_at, workout_result_id, previous_value)
         VALUES
          (@id, @athleteId, @referenceId, @referenceType, @category,
           @value, @unit, @achievedAt, @workoutResultId, @previousValue)`
      )
      .run({
        id: pr.id,
        athleteId: pr.athleteId,
        referenceId: pr.referenceId,
        referenceType: pr.referenceType,
        category: pr.category,
        value: pr.value,
        unit: pr.unit,
        achievedAt: pr.achievedAt,
        workoutResultId: pr.workoutResultId ?? null,
        previousValue: pr.previousValue ?? null,
      });
  }

  /**
   * Get the current best PR for a given athlete + reference + category.
   */
  getCurrentPR(
    athleteId: string,
    referenceId: string,
    category: PRCategory
  ): PersonalRecord | null {
    const row = this.db
      .prepare(
        `SELECT * FROM personal_records
         WHERE athlete_id = ? AND reference_id = ? AND category = ?
         ORDER BY value DESC
         LIMIT 1`
      )
      .get(athleteId, referenceId, category) as any;
    return row ? this.rowToPR(row) : null;
  }

  /**
   * Get the current best PR for time-based records (lower is better).
   */
  getCurrentTimePR(
    athleteId: string,
    referenceId: string,
    category: PRCategory
  ): PersonalRecord | null {
    const row = this.db
      .prepare(
        `SELECT * FROM personal_records
         WHERE athlete_id = ? AND reference_id = ? AND category = ?
         ORDER BY value ASC
         LIMIT 1`
      )
      .get(athleteId, referenceId, category) as any;
    return row ? this.rowToPR(row) : null;
  }

  /**
   * Get all PRs for an athlete.
   */
  getAllForAthlete(athleteId: string): PersonalRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM personal_records
         WHERE athlete_id = ?
         ORDER BY achieved_at DESC`
      )
      .all(athleteId) as any[];
    return rows.map((r) => this.rowToPR(r));
  }

  /**
   * Get all PRs for a specific movement or workout.
   */
  getForReference(
    athleteId: string,
    referenceId: string
  ): PersonalRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM personal_records
         WHERE athlete_id = ? AND reference_id = ?
         ORDER BY achieved_at DESC`
      )
      .all(athleteId, referenceId) as any[];
    return rows.map((r) => this.rowToPR(r));
  }

  /**
   * Get recent PRs (for displaying "new PRs" after a workout).
   */
  getRecent(athleteId: string, limit = 10): PersonalRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM personal_records
         WHERE athlete_id = ?
         ORDER BY achieved_at DESC
         LIMIT ?`
      )
      .all(athleteId, limit) as any[];
    return rows.map((r) => this.rowToPR(r));
  }

  private rowToPR(row: any): PersonalRecord {
    return {
      id: row.id,
      athleteId: row.athlete_id,
      referenceId: row.reference_id,
      referenceType: row.reference_type,
      category: row.category as PRCategory,
      value: row.value,
      unit: row.unit as PRUnit,
      achievedAt: row.achieved_at,
      workoutResultId: row.workout_result_id ?? undefined,
      previousValue: row.previous_value ?? undefined,
    };
  }
}
