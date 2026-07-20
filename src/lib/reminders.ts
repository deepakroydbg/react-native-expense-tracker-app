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

/** How many reminders fire per day, one hour apart from the chosen time. */
const REMINDERS_PER_DAY = 3;

/**
 * Pool of playful nudges. Each day we pick a few distinct ones so the reminders
 * never feel repetitive.
 */
const REMINDER_MESSAGES: { title: string; body: string }[] = [
  {
    title: '💸 Paisa kahan gaya?',
    body: "Add today's expenses before you forget. It takes less than 10 seconds!",
  },
  {
    title: '📒 Update your Khata',
    body: "Keep your Khata complete by recording today's income and expenses.",
  },
  {
    title: '☕ Chai ho ya shopping...',
    body: 'Every transaction counts. Record it now and stay in control.',
  },
  {
    title: '🌙 Before you sleep...',
    body: "Spend 10 seconds updating your Khata. Tomorrow's balance will thank you.",
  },
  {
    title: '🛒 Shopping done?',
    body: "Don't let today's expenses disappear. Add them to your Khata now.",
  },
  {
    title: '💰 Save smarter',
    body: 'Tracking every rupee today helps you save more tomorrow.',
  },
  {
    title: '📱 One quick update',
    body: "Record today's transactions now. Your Khata deserves to stay updated.",
  },
  {
    title: '🍕 Ordered something?',
    body: 'Food, fuel, shopping... Add every expense before you forget!',
  },
  {
    title: '🚗 Fuel bharwaya?',
    body: 'Record your fuel expense in MyKhata and track your monthly spending.',
  },
  {
    title: '🧾 Bill paid?',
    body: 'Electricity, internet, rent... Keep every payment safely recorded.',
  },
  {
    title: '📊 Every Rupee Matters',
    body: 'A small habit today can make a big difference in your savings.',
  },
  {
    title: '✨ Stay organized',
    body: "Keep your Khata updated with today's income and expenses.",
  },
  {
    title: '💼 Business ya personal?',
    body: 'No matter what it is, record every transaction in MyKhata.',
  },
  {
    title: '🎯 Daily habit',
    body: 'Just 10 seconds today can save you hours at month-end.',
  },
  {
    title: '🤔 Yaad hai?',
    body: "Did you record today's expenses? Do it now before you forget.",
  },
  {
    title: '📒 Khata check!',
    body: 'Your daily entries keep your finances accurate. Update them now.',
  },
  {
    title: '💵 Income received?',
    body: "Don't just track expenses—record today's income too.",
  },
  {
    title: '🏠 Ghar ka kharcha',
    body: "Groceries, milk, gas... Add today's household expenses in MyKhata.",
  },
  {
    title: '🎉 Small expense?',
    body: 'Even ₹20 matters. Every entry helps you understand your spending.',
  },
  {
    title: '❤️ Future You Says Thanks',
    body: 'Take 10 seconds to update MyKhata today. Your future self will appreciate it!',
  },
];

/** Return `count` distinct messages from the pool in random order. */
function pickMessages(count: number): { title: string; body: string }[] {
  const shuffled = [...REMINDER_MESSAGES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

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

  // Schedule the daily reminders, one hour apart, starting at the chosen time.
  const messages = pickMessages(REMINDERS_PER_DAY);
  for (let i = 0; i < messages.length; i++) {
    const totalMinutes = time.hour * 60 + time.minute + i * 60;
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    await Notifications.scheduleNotificationAsync({
      content: messages[i],
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
  }

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
