import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

let _db: Database.Database | null = null;

/**
 * Default database path: ~/.wod-assistant/wod.db
 */
function defaultDbPath(): string {
  const dir = path.join(os.homedir(), ".wod-assistant");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "wod.db");
}

/**
 * Get the singleton database connection.
 * Creates the database and runs migrations if it doesn't exist yet.
 */
export function getDb(dbPath?: string): Database.Database {
  if (_db) return _db;

  const resolvedPath = dbPath ?? defaultDbPath();
  _db = new Database(resolvedPath);

  // Enable WAL mode for better concurrent read performance
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  runMigrations(_db);
  return _db;
}

/**
 * Open a fresh in-memory database (for testing).
 */
export function getTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

/**
 * Close the singleton connection.
 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/**
 * Run all schema migrations.
 * Uses a simple version-tracking table.
 */
function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  const currentVersion =
    (db.prepare("SELECT MAX(version) AS v FROM schema_version").get() as any)
      ?.v ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      db.transaction(() => {
        db.exec(migration.sql);
        db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(
          migration.version
        );
      })();
    }
  }
}

interface Migration {
  version: number;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      -- Athletes
      CREATE TABLE athletes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
        equipment_json TEXT NOT NULL DEFAULT '[]',
        preferred_duration INTEGER,
        framework TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Workouts (definitions)
      CREATE TABLE workouts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        format TEXT NOT NULL,
        movements_json TEXT NOT NULL,
        time_cap INTEGER,
        rounds INTEGER,
        work_interval INTEGER,
        rest_interval INTEGER,
        emom_minutes INTEGER,
        score_type TEXT NOT NULL,
        description TEXT,
        is_benchmark INTEGER NOT NULL DEFAULT 0,
        estimated_duration INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Workout results (logged performances)
      CREATE TABLE workout_results (
        id TEXT PRIMARY KEY,
        athlete_id TEXT NOT NULL REFERENCES athletes(id),
        workout_id TEXT NOT NULL REFERENCES workouts(id),
        performed_at TEXT NOT NULL,
        score_type TEXT NOT NULL,
        time_seconds REAL,
        rounds_completed INTEGER,
        partial_reps INTEGER,
        peak_load REAL,
        total_reps INTEGER,
        total_calories REAL,
        total_distance REAL,
        rpe REAL,
        rx INTEGER NOT NULL DEFAULT 0,
        scaling_tier TEXT,
        movement_results_json TEXT NOT NULL DEFAULT '[]',
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_results_athlete ON workout_results(athlete_id);
      CREATE INDEX idx_results_workout ON workout_results(workout_id);
      CREATE INDEX idx_results_performed ON workout_results(performed_at);

      -- Personal records
      CREATE TABLE personal_records (
        id TEXT PRIMARY KEY,
        athlete_id TEXT NOT NULL REFERENCES athletes(id),
        reference_id TEXT NOT NULL,
        reference_type TEXT NOT NULL CHECK (reference_type IN ('movement', 'workout')),
        category TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        achieved_at TEXT NOT NULL,
        workout_result_id TEXT REFERENCES workout_results(id),
        previous_value REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_prs_athlete ON personal_records(athlete_id);
      CREATE INDEX idx_prs_reference ON personal_records(reference_id, reference_type);
      CREATE INDEX idx_prs_category ON personal_records(athlete_id, reference_id, category);
    `,
  },
];
