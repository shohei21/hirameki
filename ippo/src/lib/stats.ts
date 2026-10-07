import type { StepLog } from "../types";

/** ローカル日付の YYYY-MM-DD */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function shiftDay(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export interface Stats {
  todaySteps: number;
  /** 今日まで(今日が0件なら昨日まで)連続で一歩を踏んだ日数 */
  streakDays: number;
  totalSteps: number;
  totalMinutes: number;
  activeDays: number;
}

export function computeStats(logs: StepLog[], now: number): Stats {
  const days = new Set(logs.map((l) => dayKey(l.startedAt)));
  const today = dayKey(now);

  let cursor = days.has(today) ? now : shiftDay(now, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }

  const totalSec = logs.reduce((sum, l) => sum + l.durationSec, 0);
  return {
    todaySteps: logs.filter((l) => dayKey(l.startedAt) === today).length,
    streakDays: streak,
    totalSteps: logs.length,
    totalMinutes: Math.round(totalSec / 60),
    activeDays: days.size,
  };
}

/** 直近 n 日(古い順)の日別件数 */
export function recentDays(logs: StepLog[], now: number, n: number): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const l of logs) {
    const k = dayKey(l.startedAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const result: { key: string; count: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = dayKey(shiftDay(now, -i));
    result.push({ key: k, count: counts.get(k) ?? 0 });
  }
  return result;
}
