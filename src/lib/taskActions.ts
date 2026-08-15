import type { SQLiteDatabase } from 'expo-sqlite';
import { settingsRepo, tasksRepo } from '../db';
import type { GardenTask } from '../db/types';
import { addDays } from './dates';
import { cancelTaskReminder, scheduleTaskReminder } from './notifications';

/**
 * Marks a task done and, if it recurs, schedules the next occurrence
 * (with its own notification) so recurring chores like watering keep going.
 */
export async function completeTaskAndReschedule(db: SQLiteDatabase, task: GardenTask): Promise<void> {
  await tasksRepo.completeTask(db, task.id);
  await cancelTaskReminder(task.notification_id);

  if (task.recurrence_days) {
    const nextDueDate = addDays(task.due_date, task.recurrence_days);
    const notificationsEnabled =
      (await settingsRepo.getSetting(db, settingsRepo.SETTINGS_KEYS.notificationsEnabled)) !== 'false';
    const notificationId = notificationsEnabled
      ? await scheduleTaskReminder(task.title, task.notes ?? 'Garden Log reminder', nextDueDate)
      : null;
    await tasksRepo.createTask(
      db,
      {
        plant_id: task.plant_id,
        bed_id: task.bed_id,
        title: task.title,
        notes: task.notes,
        due_date: nextDueDate,
        recurrence_days: task.recurrence_days,
      },
      notificationId
    );
  }
}
