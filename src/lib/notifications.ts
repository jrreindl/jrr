import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let channelReady = false;

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync('garden-tasks', {
    name: 'Garden tasks',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  channelReady = true;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Schedules a local notification for a task due date at 9am on that date.
 * Returns null if permission isn't granted (task is still saved without a reminder).
 */
export async function scheduleTaskReminder(
  title: string,
  body: string,
  dueDateIso: string
): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;
  await ensureAndroidChannel();

  const [year, month, day] = dueDateIso.slice(0, 10).split('-').map(Number);
  const fireDate = new Date(year, month - 1, day, 9, 0, 0);
  if (fireDate.getTime() <= Date.now()) {
    fireDate.setTime(Date.now() + 5000);
  }

  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
  });
}

export async function cancelTaskReminder(notificationId: string | null | undefined): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already fired or cancelled; nothing to do.
  }
}
