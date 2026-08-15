import type { SQLiteDatabase } from 'expo-sqlite';
import type { GardenTask } from '../types';

export async function listUpcomingTasks(db: SQLiteDatabase, limit = 50): Promise<GardenTask[]> {
  return db.getAllAsync<GardenTask>(
    `SELECT * FROM tasks WHERE completed_at IS NULL ORDER BY due_date ASC LIMIT ?;`,
    limit
  );
}

export async function listOverdueTasks(db: SQLiteDatabase): Promise<GardenTask[]> {
  return db.getAllAsync<GardenTask>(
    `SELECT * FROM tasks WHERE completed_at IS NULL AND date(due_date) < date('now') ORDER BY due_date ASC;`
  );
}

export async function listTasksForPlant(db: SQLiteDatabase, plantId: number): Promise<GardenTask[]> {
  return db.getAllAsync<GardenTask>(
    `SELECT * FROM tasks WHERE plant_id = ? ORDER BY completed_at IS NOT NULL, due_date ASC;`,
    plantId
  );
}

export async function listCompletedTasks(db: SQLiteDatabase, limit = 50): Promise<GardenTask[]> {
  return db.getAllAsync<GardenTask>(
    `SELECT * FROM tasks WHERE completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT ?;`,
    limit
  );
}

export async function getTask(db: SQLiteDatabase, id: number): Promise<GardenTask | null> {
  return db.getFirstAsync<GardenTask>('SELECT * FROM tasks WHERE id = ?;', id);
}

export interface TaskInput {
  plant_id?: number | null;
  bed_id?: number | null;
  title: string;
  notes?: string | null;
  due_date: string;
  recurrence_days?: number | null;
}

export async function createTask(
  db: SQLiteDatabase,
  input: TaskInput,
  notificationId?: string | null
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO tasks (plant_id, bed_id, title, notes, due_date, recurrence_days, notification_id)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    input.plant_id ?? null,
    input.bed_id ?? null,
    input.title.trim(),
    input.notes?.trim() || null,
    input.due_date,
    input.recurrence_days ?? null,
    notificationId ?? null
  );
  return result.lastInsertRowId;
}

export async function updateTaskNotification(
  db: SQLiteDatabase,
  id: number,
  notificationId: string | null
): Promise<void> {
  await db.runAsync(`UPDATE tasks SET notification_id = ? WHERE id = ?;`, notificationId, id);
}

export async function completeTask(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`UPDATE tasks SET completed_at = datetime('now') WHERE id = ?;`, id);
}

export async function reopenTask(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`UPDATE tasks SET completed_at = NULL WHERE id = ?;`, id);
}

export async function deleteTask(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM tasks WHERE id = ?;`, id);
}
