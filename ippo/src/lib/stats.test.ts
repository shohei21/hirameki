import { describe, expect, it } from "vitest";
import { computeStats, recentDays } from "./stats";
import type { StepLog } from "../types";

function log(ts: number, durationSec = 120): StepLog {
  return {
    id: String(ts),
    goalId: "g",
    goalTitle: "G",
    action: "a",
    startedAt: ts,
    durationSec,
    outcome: "done",
    nextActionMemo: "",
    note: "",
  };
}

const DAY = 24 * 60 * 60 * 1000;
const now = new Date(2026, 9, 7, 12, 0).getTime();

describe("computeStats", () => {
  it("記録なし", () => {
    expect(computeStats([], now)).toEqual({
      todaySteps: 0,
      streakDays: 0,
      totalSteps: 0,
      totalMinutes: 0,
      activeDays: 0,
    });
  });

  it("今日を含む連続日数", () => {
    const s = computeStats([log(now), log(now - DAY), log(now - 2 * DAY), log(now - 4 * DAY)], now);
    expect(s.streakDays).toBe(3);
    expect(s.todaySteps).toBe(1);
    expect(s.activeDays).toBe(4);
    expect(s.totalMinutes).toBe(8);
  });

  it("今日まだ0件でも昨日までの連続は途切れない", () => {
    expect(computeStats([log(now - DAY), log(now - 2 * DAY)], now).streakDays).toBe(2);
  });
});

describe("recentDays", () => {
  it("古い順にn日分", () => {
    const r = recentDays([log(now), log(now), log(now - 2 * DAY)], now, 3);
    expect(r.map((d) => d.count)).toEqual([1, 0, 2]);
  });
});
