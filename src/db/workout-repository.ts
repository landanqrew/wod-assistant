import type Database from "better-sqlite3";
import type { Workout, MovementPrescription } from "../models/workout.js";
import { WorkoutFormat, ScoreType } from "../models/workout.js";
import { getMovement } from "../movements/library.js";

/**
 * Repository for persisting and querying workout definitions.
 */
export class WorkoutRepository {
  constructor(private db: Database.Database) {}

  /**
   * Insert a workout definition.
   */
  save(workout: Workout): void {
    this.db
      .prepare(
        `INSERT INTO workouts
          (id, name, format, movements_json, time_cap, rounds,
           work_interval, rest_interval, emom_minutes,
           score_type, description, is_benchmark, estimated_duration)
         VALUES
          (@id, @name, @format, @movementsJson, @timeCap, @rounds,
           @workInterval, @restInterval, @emomMinutes,
           @scoreType, @description, @isBenchmark, @estimatedDuration)`
      )
      .run({
        id: workout.id,
        name: workout.name,
        format: workout.format,
        movementsJson: JSON.stringify(
          workout.movements.map((m) => ({
            movementId: m.movementId,
            reps: m.reps,
            load: m.load,
            distance: m.distance,
            duration: m.duration,
            calories: m.calories,
            notes: m.notes,
          }))
        ),
        timeCap: workout.timeCap ?? null,
        rounds: workout.rounds ?? null,
        workInterval: workout.workInterval ?? null,
        restInterval: workout.restInterval ?? null,
        emomMinutes: workout.emomMinutes ?? null,
        scoreType: workout.scoreType,
        description: workout.description ?? null,
        isBenchmark: workout.isBenchmark ? 1 : 0,
        estimatedDuration: workout.estimatedDuration ?? null,
      });
  }

  /**
   * Get a workout by ID.
   */
  getById(id: string): Workout | null {
    const row = this.db
      .prepare("SELECT * FROM workouts WHERE id = ?")
      .get(id) as any;
    return row ? this.rowToWorkout(row) : null;
  }

  /**
   * Get the most recent workouts.
   */
  getRecent(limit = 10): Workout[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM workouts
         ORDER BY created_at DESC, rowid DESC
         LIMIT ?`
      )
      .all(limit) as any[];
    return rows.map((r) => this.rowToWorkout(r));
  }

  /**
   * Get all benchmark workouts.
   */
  getBenchmarks(): Workout[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM workouts
         WHERE is_benchmark = 1
         ORDER BY name ASC`
      )
      .all() as any[];
    return rows.map((r) => this.rowToWorkout(r));
  }

  /**
   * Delete a workout by ID.
   */
  delete(id: string): boolean {
    const info = this.db
      .prepare("DELETE FROM workouts WHERE id = ?")
      .run(id);
    return info.changes > 0;
  }

  private rowToWorkout(row: any): Workout {
    const rawMovements = JSON.parse(row.movements_json ?? "[]") as any[];
    const movements: MovementPrescription[] = rawMovements.map((m: any) => ({
      movementId: m.movementId,
      movement: getMovement(m.movementId) ?? undefined,
      reps: m.reps,
      load: m.load,
      distance: m.distance,
      duration: m.duration,
      calories: m.calories,
      notes: m.notes,
    }));

    return {
      id: row.id,
      name: row.name,
      format: row.format as WorkoutFormat,
      movements,
      timeCap: row.time_cap ?? undefined,
      rounds: row.rounds ?? undefined,
      workInterval: row.work_interval ?? undefined,
      restInterval: row.rest_interval ?? undefined,
      emomMinutes: row.emom_minutes ?? undefined,
      scoreType: row.score_type as ScoreType,
      description: row.description ?? undefined,
      isBenchmark: row.is_benchmark === 1,
      estimatedDuration: row.estimated_duration ?? undefined,
    };
  }
}
