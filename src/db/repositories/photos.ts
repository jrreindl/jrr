import type { SQLiteDatabase } from 'expo-sqlite';
import type { PhotoType, PlantPhoto } from '../types';

export async function listPhotosForPlant(
  db: SQLiteDatabase,
  plantId: number,
  photoType?: PhotoType
): Promise<PlantPhoto[]> {
  if (photoType) {
    return db.getAllAsync<PlantPhoto>(
      `SELECT * FROM plant_photos WHERE plant_id = ? AND photo_type = ? ORDER BY taken_at DESC;`,
      plantId,
      photoType
    );
  }
  return db.getAllAsync<PlantPhoto>(
    `SELECT * FROM plant_photos WHERE plant_id = ? ORDER BY taken_at DESC;`,
    plantId
  );
}

export async function getPhoto(db: SQLiteDatabase, id: number): Promise<PlantPhoto | null> {
  return db.getFirstAsync<PlantPhoto>('SELECT * FROM plant_photos WHERE id = ?;', id);
}

export async function getLatestPhotoForPlant(
  db: SQLiteDatabase,
  plantId: number
): Promise<PlantPhoto | null> {
  return db.getFirstAsync<PlantPhoto>(
    `SELECT * FROM plant_photos WHERE plant_id = ? ORDER BY taken_at DESC LIMIT 1;`,
    plantId
  );
}

export interface PhotoInput {
  plant_id: number;
  uri: string;
  photo_type: PhotoType;
  caption?: string | null;
  ocr_text?: string | null;
}

export async function addPhoto(db: SQLiteDatabase, input: PhotoInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO plant_photos (plant_id, uri, photo_type, caption, ocr_text) VALUES (?, ?, ?, ?, ?);`,
    input.plant_id,
    input.uri,
    input.photo_type,
    input.caption?.trim() || null,
    input.ocr_text?.trim() || null
  );
  return result.lastInsertRowId;
}

export async function updatePhotoCaption(db: SQLiteDatabase, id: number, caption: string): Promise<void> {
  await db.runAsync(`UPDATE plant_photos SET caption = ? WHERE id = ?;`, caption.trim() || null, id);
}

export async function deletePhoto(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM plant_photos WHERE id = ?;`, id);
}
