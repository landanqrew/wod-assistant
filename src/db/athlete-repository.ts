import type Database from "better-sqlite3";
import type { Athlete } from "../models/athlete.js";
import { Sex } from "../models/athlete.js";
import type { Equipment } from "../models/equipment.js";

/**
 * Repository for persisting and querying athlete profiles.
 */
export class AthleteRepository {
  constructor(private db: Database.Database) {}

  /**
   * Insert or update an athlete profile.
   */
  save(athlete: Athlete): void {
    this.db
      .prepare(
        `INSERT INTO athletes
          (id, name, sex, equipment_json, preferred_duration, framework, notes, updated_at)
         VALUES
          (@id, @name, @sex, @equipmentJson, @preferredDuration, @framework, @notes, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
          name = @name,
          sex = @sex,
          equipment_json = @equipmentJson,
          preferred_duration = @preferredDuration,
          framework = @framework,
          notes = @notes,
          updated_at = datetime('now')`
      )
      .run({
        id: athlete.id,
        name: athlete.name,
        sex: athlete.sex,
        equipmentJson: JSON.stringify([...athlete.equipment]),
        preferredDuration: athlete.preferredDuration ?? null,
        framework: athlete.framework ?? null,
        notes: athlete.notes ?? null,
      });
  }

  /**
   * Get an athlete by ID.
   */
  getById(id: string): Athlete | null {
    const row = this.db
      .prepare("SELECT * FROM athletes WHERE id = ?")
      .get(id) as any;
    return row ? this.rowToAthlete(row) : null;
  }

  /**
   * Get the default (first) athlete, or null if none exists.
   */
  getDefault(): Athlete | null {
    const row = this.db
      .prepare("SELECT * FROM athletes ORDER BY created_at ASC LIMIT 1")
      .get() as any;
    return row ? this.rowToAthlete(row) : null;
  }

  /**
   * List all athletes.
   */
  getAll(): Athlete[] {
    const rows = this.db
      .prepare("SELECT * FROM athletes ORDER BY created_at ASC")
      .all() as any[];
    return rows.map((r) => this.rowToAthlete(r));
  }

  /**
   * Delete an athlete by ID.
   */
  delete(id: string): boolean {
    const info = this.db
      .prepare("DELETE FROM athletes WHERE id = ?")
      .run(id);
    return info.changes > 0;
  }

  private rowToAthlete(row: any): Athlete {
    const equipment: Equipment[] = JSON.parse(row.equipment_json ?? "[]");
    return {
      id: row.id,
      name: row.name,
      sex: row.sex as Sex,
      equipment: new Set(equipment),
      impediments: [],
      preferredDuration: row.preferred_duration ?? undefined,
      framework: row.framework ?? undefined,
      notes: row.notes ?? undefined,
    };
  }
}
