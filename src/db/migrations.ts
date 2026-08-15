import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'garden-log.db';

const MIGRATIONS: string[] = [
  // v1: initial schema
  `
  CREATE TABLE IF NOT EXISTS beds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'bed',
    location TEXT,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bed_id INTEGER REFERENCES beds(id) ON DELETE SET NULL,
    common_name TEXT NOT NULL,
    variety TEXT,
    species TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    date_planted TEXT,
    date_transplanted TEXT,
    expected_harvest_date TEXT,
    sun_requirement TEXT,
    water_notes TEXT,
    spacing_notes TEXT,
    care_notes TEXT,
    quantity INTEGER,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    season TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS plant_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    uri TEXT NOT NULL,
    photo_type TEXT NOT NULL DEFAULT 'progress',
    caption TEXT,
    ocr_text TEXT,
    taken_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER REFERENCES plants(id) ON DELETE CASCADE,
    bed_id INTEGER REFERENCES beds(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL DEFAULT 'note',
    body TEXT NOT NULL,
    photo_id INTEGER REFERENCES plant_photos(id) ON DELETE SET NULL,
    entry_date TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER REFERENCES plants(id) ON DELETE CASCADE,
    bed_id INTEGER REFERENCES beds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,
    due_date TEXT NOT NULL,
    recurrence_days INTEGER,
    completed_at TEXT,
    notification_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS harvest_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    harvest_date TEXT NOT NULL DEFAULT (datetime('now')),
    quantity REAL,
    unit TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_plants_bed_id ON plants(bed_id);
  CREATE INDEX IF NOT EXISTS idx_plant_photos_plant_id ON plant_photos(plant_id);
  CREATE INDEX IF NOT EXISTS idx_journal_entries_plant_id ON journal_entries(plant_id);
  CREATE INDEX IF NOT EXISTS idx_journal_entries_bed_id ON journal_entries(bed_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_tasks_plant_id ON tasks(plant_id);
  CREATE INDEX IF NOT EXISTS idx_harvest_logs_plant_id ON harvest_logs(plant_id);
  `,
];

/**
 * Runs any migrations newer than the database's stored PRAGMA user_version.
 * Safe to call on every app start; each migration only runs once per install.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let currentVersion = row?.user_version ?? 0;

  if (currentVersion >= MIGRATIONS.length) {
    return;
  }

  for (let version = currentVersion; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
    });
    currentVersion = version + 1;
    await db.execAsync(`PRAGMA user_version = ${currentVersion};`);
  }
}
