// 実行中の一歩。スマホでタブが裏に回ったりリロードされても、開始時刻から復元できるよう保存しておく。

const KEY = "ippo:v1:active";

export interface ActiveSession {
  goalId: string;
  action: string;
  startedAt: number;
  minutes: number;
}

export function loadActive(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    const r = v as Record<string, unknown>;
    if (
      typeof r["goalId"] === "string" &&
      typeof r["action"] === "string" &&
      typeof r["startedAt"] === "number" &&
      typeof r["minutes"] === "number"
    ) {
      return { goalId: r["goalId"], action: r["action"], startedAt: r["startedAt"], minutes: r["minutes"] };
    }
  } catch {
    // 壊れていたら無視して新しく始める
  }
  return null;
}

export function saveActive(s: ActiveSession | null): void {
  try {
    if (s === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 保存できなくてもタイマー自体は動く
  }
}
