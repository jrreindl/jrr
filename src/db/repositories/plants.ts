import type { SQLiteDatabase } from 'expo-sqlite';
import type { Plant, PlantInput, PlantStatus } from '../types';

export interface PlantFilter {
  bedId?: number;
  status?: PlantStatus;
  search?: string;
  includeArchived?: boolean;
  favoritesOnly?: boolean;
}

export async function listPlants(db: SQLiteDatabase, filter: PlantFilter = {}): Promise<Plant[]> {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (!filter.includeArchived) {
    clauses.push('archived_at IS NULL');
  }
  if (filter.bedId != null) {
    clauses.push('bed_id = ?');
    params.push(filter.bedId);
  }
  if (filter.status) {
    clauses.push('status = ?');
    params.push(filter.status);
  }
  if (filter.favoritesOnly) {
    clauses.push('is_favorite = 1');
  }
  if (filter.search) {
    clauses.push('(common_name LIKE ? OR variety LIKE ? OR species LIKE ?)');
    const like = `%${filter.search}%`;
    params.push(like, like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return db.getAllAsync<Plant>(
    `SELECT * FROM plants ${where} ORDER BY updated_at DESC;`,
    ...params
  );
}

export async function getPlant(db: SQLiteDatabase, id: number): Promise<Plant | null> {
  return db.getFirstAsync<Plant>('SELECT * FROM plants WHERE id = ?;', id);
}

export async function createPlant(db: SQLiteDatabase, input: PlantInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO plants
      (bed_id, common_name, variety, species, source, status, date_planted, date_transplanted,
       expected_harvest_date, sun_requirement, water_notes, spacing_notes, care_notes, quantity, season)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    input.bed_id,
    input.common_name.trim(),
    input.variety?.trim() || null,
    input.species?.trim() || null,
    input.source?.trim() || null,
    input.status,
    input.date_planted || null,
    input.date_transplanted || null,
    input.expected_harvest_date || null,
    input.sun_requirement || null,
    input.water_notes?.trim() || null,
    input.spacing_notes?.trim() || null,
    input.care_notes?.trim() || null,
    input.quantity ?? null,
    input.season?.trim() || null
  );
  return result.lastInsertRowId;
}

export async function updatePlant(db: SQLiteDatabase, id: number, input: PlantInput): Promise<void> {
  await db.runAsync(
    `UPDATE plants SET
       bed_id = ?, common_name = ?, variety = ?, species = ?, source = ?, status = ?,
       date_planted = ?, date_transplanted = ?, expected_harvest_date = ?, sun_requirement = ?,
       water_notes = ?, spacing_notes = ?, care_notes = ?, quantity = ?, season = ?,
       updated_at = datetime('now')
     WHERE id = ?;`,
    input.bed_id,
    input.common_name.trim(),
    input.variety?.trim() || null,
    input.species?.trim() || null,
    input.source?.trim() || null,
    input.status,
    input.date_planted || null,
    input.date_transplanted || null,
    input.expected_harvest_date || null,
    input.sun_requirement || null,
    input.water_notes?.trim() || null,
    input.spacing_notes?.trim() || null,
    input.care_notes?.trim() || null,
    input.quantity ?? null,
    input.season?.trim() || null,
    id
  );
}

export async function setPlantStatus(db: SQLiteDatabase, id: number, status: PlantStatus): Promise<void> {
  await db.runAsync(`UPDATE plants SET status = ?, updated_at = datetime('now') WHERE id = ?;`, status, id);
}

export async function toggleFavorite(db: SQLiteDatabase, id: number, isFavorite: boolean): Promise<void> {
  await db.runAsync(
    `UPDATE plants SET is_favorite = ?, updated_at = datetime('now') WHERE id = ?;`,
    isFavorite ? 1 : 0,
    id
  );
}

export async function archivePlant(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`UPDATE plants SET archived_at = datetime('now') WHERE id = ?;`, id);
}

export async function deletePlant(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM plants WHERE id = ?;`, id);
}

export async function countPlants(db: SQLiteDatabase): Promise<{ total: number; active: number }> {
  const total = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM plants;');
  const active = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM plants WHERE archived_at IS NULL AND status NOT IN ('finished', 'dead');`
  );
  return { total: total?.count ?? 0, active: active?.count ?? 0 };
}
