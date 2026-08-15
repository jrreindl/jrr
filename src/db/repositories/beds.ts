import type { SQLiteDatabase } from 'expo-sqlite';
import type { Bed, BedType } from '../types';

export async function listBeds(db: SQLiteDatabase, includeArchived = false): Promise<Bed[]> {
  const where = includeArchived ? '' : 'WHERE archived_at IS NULL';
  return db.getAllAsync<Bed>(`SELECT * FROM beds ${where} ORDER BY sort_order ASC, name ASC;`);
}

export async function getBed(db: SQLiteDatabase, id: number): Promise<Bed | null> {
  return db.getFirstAsync<Bed>('SELECT * FROM beds WHERE id = ?;', id);
}

export interface BedInput {
  name: string;
  type: BedType;
  location?: string | null;
  notes?: string | null;
}

export async function createBed(db: SQLiteDatabase, input: BedInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO beds (name, type, location, notes) VALUES (?, ?, ?, ?);`,
    input.name.trim(),
    input.type,
    input.location?.trim() || null,
    input.notes?.trim() || null
  );
  return result.lastInsertRowId;
}

export async function updateBed(db: SQLiteDatabase, id: number, input: BedInput): Promise<void> {
  await db.runAsync(
    `UPDATE beds SET name = ?, type = ?, location = ?, notes = ? WHERE id = ?;`,
    input.name.trim(),
    input.type,
    input.location?.trim() || null,
    input.notes?.trim() || null,
    id
  );
}

export async function archiveBed(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`UPDATE beds SET archived_at = datetime('now') WHERE id = ?;`, id);
}

export async function deleteBed(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM beds WHERE id = ?;`, id);
}

export async function countPlantsInBed(db: SQLiteDatabase, bedId: number): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM plants WHERE bed_id = ? AND archived_at IS NULL;`,
    bedId
  );
  return row?.count ?? 0;
}
