/**
 * Daily reminder — a single repeating local notification that nudges the user
 * to log their entries. State is persisted in AsyncStorage so it survives
 * restarts; the OS keeps the schedule alive without the app running.
 *
 * Local scheduled notifications work in Expo Go (SDK 54) and in dev/prod builds.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ENABLED_KEY = 'mykhata.daily-reminder';
const TIME_KEY = 'mykhata.daily-reminder-time'; // "HH:mm"
const CHANNEL_ID = 'daily-reminder';

export type ReminderTime = { hour: number; minute: number };
export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 21, minute: 0 };

let handlerSet = false;
function ensureHandler() {
  if (handlerSet) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerSet = true;
}

function parseTime(v: string | null): ReminderTime {
  if (v) {
    const [h, m] = v.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) return { hour: h, minute: m };
  }
  return { ...DEFAULT_REMINDER_TIME };
}

function formatTimeKey(t: ReminderTime): string {
  return `${t.hour}:${t.minute}`;
}

/** Current persisted reminder state (enabled flag + chosen time). */
export async function getReminderState(): Promise<{ enabled: boolean; time: ReminderTime }> {
  const [enabled, timeStr] = await Promise.all([
    AsyncStorage.getItem(ENABLED_KEY),
    AsyncStorage.getItem(TIME_KEY),
  ]);
  return { enabled: enabled === 'true', time: parseTime(timeStr) };
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/** Ask for notification permission; returns true if we may post notifications. */
export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  const req = await Notifications.requestPermissionsAsync();
  return (
    req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/**
 * Turn the reminder on at the given time. Requests permission first; returns
 * false (and schedules nothing) if the user denies it. Replaces any existing
 * schedule so it's safe to call repeatedly.
 */
export async function enableReminder(time: ReminderTime): Promise<boolean> {
  ensureHandler();
  const granted = await requestPermission();
  if (!granted) return false;

  await ensureAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'MyKhata Book',
      body: "Don't forget to log today's entries 📝",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
      channelId: CHANNEL_ID,
    },
  });

  await AsyncStorage.multiSet([
    [ENABLED_KEY, 'true'],
    [TIME_KEY, formatTimeKey(time)],
  ]);
  return true;
}

/** Turn the reminder off and clear the schedule. */
export async function disableReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  await AsyncStorage.setItem(ENABLED_KEY, 'false');
}

/**
 * Change the reminder time. Persists it and, if the reminder is currently on,
 * reschedules at the new time.
 */
export async function updateReminderTime(time: ReminderTime): Promise<boolean> {
  await AsyncStorage.setItem(TIME_KEY, formatTimeKey(time));
  const enabled = (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';
  if (enabled) return enableReminder(time);
  return true;
}
