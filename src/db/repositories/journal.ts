import type { SQLiteDatabase } from 'expo-sqlite';
import type { JournalEntry, JournalEntryType } from '../types';

export async function listJournalForPlant(db: SQLiteDatabase, plantId: number): Promise<JournalEntry[]> {
  return db.getAllAsync<JournalEntry>(
    `SELECT * FROM journal_entries WHERE plant_id = ? ORDER BY entry_date DESC, id DESC;`,
    plantId
  );
}

export async function listJournalForBed(db: SQLiteDatabase, bedId: number): Promise<JournalEntry[]> {
  return db.getAllAsync<JournalEntry>(
    `SELECT * FROM journal_entries WHERE bed_id = ? ORDER BY entry_date DESC, id DESC;`,
    bedId
  );
}

export async function listRecentJournal(db: SQLiteDatabase, limit = 10): Promise<JournalEntry[]> {
  return db.getAllAsync<JournalEntry>(
    `SELECT * FROM journal_entries ORDER BY entry_date DESC, id DESC LIMIT ?;`,
    limit
  );
}

export interface JournalInput {
  plant_id?: number | null;
  bed_id?: number | null;
  entry_type: JournalEntryType;
  body: string;
  photo_id?: number | null;
  entry_date?: string;
}

export async function addJournalEntry(db: SQLiteDatabase, input: JournalInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO journal_entries (plant_id, bed_id, entry_type, body, photo_id, entry_date)
     VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')));`,
    input.plant_id ?? null,
    input.bed_id ?? null,
    input.entry_type,
    input.body.trim(),
    input.photo_id ?? null,
    input.entry_date ?? null
  );
  return result.lastInsertRowId;
}

export async function deleteJournalEntry(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM journal_entries WHERE id = ?;`, id);
}
