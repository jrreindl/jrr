import type { SQLiteDatabase } from 'expo-sqlite';
import type { HarvestLog } from '../types';

export async function listHarvestsForPlant(db: SQLiteDatabase, plantId: number): Promise<HarvestLog[]> {
  return db.getAllAsync<HarvestLog>(
    `SELECT * FROM harvest_logs WHERE plant_id = ? ORDER BY harvest_date DESC;`,
    plantId
  );
}

export async function listRecentHarvests(db: SQLiteDatabase, limit = 10): Promise<HarvestLog[]> {
  return db.getAllAsync<HarvestLog>(
    `SELECT * FROM harvest_logs ORDER BY harvest_date DESC LIMIT ?;`,
    limit
  );
}

export interface HarvestInput {
  plant_id: number;
  harvest_date?: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
}

export async function addHarvest(db: SQLiteDatabase, input: HarvestInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO harvest_logs (plant_id, harvest_date, quantity, unit, notes)
     VALUES (?, COALESCE(?, datetime('now')), ?, ?, ?);`,
    input.plant_id,
    input.harvest_date ?? null,
    input.quantity ?? null,
    input.unit?.trim() || null,
    input.notes?.trim() || null
  );
  return result.lastInsertRowId;
}

export async function deleteHarvest(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM harvest_logs WHERE id = ?;`, id);
}
