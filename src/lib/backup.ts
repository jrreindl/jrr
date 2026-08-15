import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

const TABLES = [
  'beds',
  'plants',
  'plant_photos',
  'journal_entries',
  'tasks',
  'harvest_logs',
  'settings',
] as const;

export interface BackupData {
  version: 1;
  exportedAt: string;
  beds: Record<string, unknown>[];
  plants: Record<string, unknown>[];
  plant_photos: Record<string, unknown>[];
  journal_entries: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  harvest_logs: Record<string, unknown>[];
  settings: Record<string, unknown>[];
}

export async function buildBackup(db: SQLiteDatabase): Promise<BackupData> {
  const data = { version: 1, exportedAt: new Date().toISOString() } as BackupData;
  for (const table of TABLES) {
    data[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table};`);
  }
  return data;
}

/**
 * Exports all garden data (not photo binaries, just their file paths and records)
 * as a JSON file and opens the system share sheet so it can be saved anywhere.
 */
export async function exportBackup(db: SQLiteDatabase): Promise<void> {
  const data = await buildBackup(db);
  const json = JSON.stringify(data, null, 2);
  const filename = `garden-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(json);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save Garden Log backup',
    });
  }
}

export interface ImportResult {
  imported: boolean;
  message: string;
}

function isBackupData(value: unknown): value is BackupData {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return obj.version === 1 && TABLES.every((table) => Array.isArray(obj[table]));
}

/**
 * Lets the user pick a previously exported JSON file and fully replaces the
 * current database contents with it. Photo file paths are restored as-is;
 * if the photo files themselves no longer exist on this device the records
 * remain but the images won't load.
 */
export async function pickAndImportBackup(db: SQLiteDatabase): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) {
    return { imported: false, message: 'Cancelled.' };
  }

  const file = new File(result.assets[0].uri);
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { imported: false, message: 'Could not read that file.' };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { imported: false, message: 'That file is not valid JSON.' };
  }

  if (!isBackupData(data)) {
    return { imported: false, message: "That file doesn't look like a Garden Log backup." };
  }

  await restoreBackup(db, data);
  return { imported: true, message: 'Backup restored.' };
}

async function restoreBackup(db: SQLiteDatabase, data: BackupData): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.withTransactionAsync(async () => {
      for (const table of [...TABLES].reverse()) {
        await db.execAsync(`DELETE FROM ${table};`);
      }
      for (const table of TABLES) {
        for (const row of data[table]) {
          const keys = Object.keys(row);
          if (keys.length === 0) continue;
          const placeholders = keys.map(() => '?').join(', ');
          const values = keys.map((key) => row[key] as string | number | null);
          await db.runAsync(
            `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders});`,
            ...values
          );
        }
      }
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}
