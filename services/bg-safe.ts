import AsyncStorage from '@react-native-async-storage/async-storage';

const IDEMPOTENCY_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const TIMEOUT_MS = 15 * 1000; // 15 seconds

export function safeBackground<T>(fn: (...args: any[]) => Promise<T>, label: string, ms: number = TIMEOUT_MS) {
  return async (...args: any[]): Promise<T | undefined> => {
    let timeoutId: number | undefined;
    const timeoutPromise = new Promise<undefined>((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn(`Background task '${label}' timed out after ${ms}ms`);
        resolve(undefined);
      }, ms);
    });

    try {
      const result = await Promise.race([
        fn(...args),
        timeoutPromise,
      ]);
      if (timeoutId) clearTimeout(timeoutId);
      return result;
    } catch (error) {
      console.error(`Error in background task '${label}':`, error);
      if (timeoutId) clearTimeout(timeoutId);
      return undefined;
    }
  };
}

export async function wasHandledOnce(key: string): Promise<boolean> {
  const lastHandled = await AsyncStorage.getItem(`handled_once_${key}`);
  const now = Date.now();

  if (lastHandled) {
    const lastHandledTime = parseInt(lastHandled, 10);
    if (now - lastHandledTime < IDEMPOTENCY_WINDOW_MS) {
      console.log(`Event '${key}' was handled recently. Skipping.`);
      return true;
    }
  }

  await AsyncStorage.setItem(`handled_once_${key}`, now.toString());
  return false;
}
