import { useSQLiteContext } from 'expo-sqlite';
import { ReactNode, useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { DateField } from '../../src/components/DateField';
import { Screen } from '../../src/components/Screen';
import { SectionHeader } from '../../src/components/SectionHeader';
import { settingsRepo } from '../../src/db';
import { exportBackup, pickAndImportBackup } from '../../src/lib/backup';
import { requestNotificationPermission } from '../../src/lib/notifications';
import { colors, spacing } from '../../src/lib/theme';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [lastFrost, setLastFrost] = useState<string | null>(null);
  const [firstFrost, setFirstFrost] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [saveToCameraRoll, setSaveToCameraRoll] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      const all = await settingsRepo.getAllSettings(db);
      setLastFrost(all[settingsRepo.SETTINGS_KEYS.lastFrostDate] ?? null);
      setFirstFrost(all[settingsRepo.SETTINGS_KEYS.firstFrostDate] ?? null);
      setNotificationsEnabled(all[settingsRepo.SETTINGS_KEYS.notificationsEnabled] !== 'false');
      setSaveToCameraRoll(all[settingsRepo.SETTINGS_KEYS.saveToCameraRoll] !== 'false');
    })();
  }, [db]);

  async function updateLastFrost(value: string | null) {
    setLastFrost(value);
    await settingsRepo.setSetting(db, settingsRepo.SETTINGS_KEYS.lastFrostDate, value ?? '');
  }

  async function updateFirstFrost(value: string | null) {
    setFirstFrost(value);
    await settingsRepo.setSetting(db, settingsRepo.SETTINGS_KEYS.firstFrostDate, value ?? '');
  }

  async function toggleNotifications(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications blocked',
          'Enable notifications for Garden Log in your phone Settings app to get task reminders.',
          [
            { text: 'OK', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    setNotificationsEnabled(value);
    await settingsRepo.setSetting(db, settingsRepo.SETTINGS_KEYS.notificationsEnabled, String(value));
  }

  async function toggleCameraRoll(value: boolean) {
    setSaveToCameraRoll(value);
    await settingsRepo.setSetting(db, settingsRepo.SETTINGS_KEYS.saveToCameraRoll, String(value));
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportBackup(db);
    } catch {
      Alert.alert('Export failed', 'Could not create a backup file.');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    Alert.alert(
      'Restore from backup?',
      'This replaces everything currently in Garden Log with the contents of the backup file. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose File & Restore',
          style: 'destructive',
          onPress: async () => {
            setImporting(true);
            try {
              const result = await pickAndImportBackup(db);
              if (result.imported) {
                Alert.alert('Restored', result.message);
              } else if (result.message !== 'Cancelled.') {
                Alert.alert('Import failed', result.message);
              }
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <SectionHeader title="Frost dates" />
      <Card>
        <Text style={styles.hint}>For your own reference when planning what to plant and when.</Text>
        <DateField label="Last spring frost" value={lastFrost} onChange={updateLastFrost} optional />
        <DateField label="First fall frost" value={firstFrost} onChange={updateFirstFrost} optional />
      </Card>

      <SectionHeader title="Notifications" />
      <Card>
        <Row label="Task reminders" description="Get a notification when a task is due">
          <Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ true: colors.primary }} />
        </Row>
      </Card>

      <SectionHeader title="Photos" />
      <Card>
        <Row label="Save to camera roll" description="Also keep a copy in your phone's Photos app as a backup">
          <Switch value={saveToCameraRoll} onValueChange={toggleCameraRoll} trackColor={{ true: colors.primary }} />
        </Row>
      </Card>

      <SectionHeader title="Backup" />
      <Card>
        <Text style={styles.hint}>
          Garden Log stores everything only on this device. Export a backup regularly, especially before
          switching phones or reinstalling the app. Photo files aren't included in the export — only the
          records that reference them — so turn on "save to camera roll" above to keep the actual images safe.
        </Text>
        <View style={styles.backupButtons}>
          <Button label="Export Backup" variant="secondary" onPress={handleExport} loading={exporting} />
          <Button label="Restore from Backup" variant="secondary" onPress={handleImport} loading={importing} />
        </View>
      </Card>

      <SectionHeader title="About" />
      <Card>
        <Text style={styles.hint}>
          Garden Log v1.0 — your personal garden tracker. All data lives locally on this device.
        </Text>
      </Card>
    </Screen>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.hint}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  backupButtons: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
