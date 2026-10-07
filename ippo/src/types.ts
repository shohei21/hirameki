/** 大きな目標(やりたいこと)。目標は大きいままでいい。小さくするのは nextAction だけ。 */
export interface Goal {
  id: string;
  title: string;
  /** 次にやる一動作(再開メモ)。空なら未設定。 */
  nextAction: string;
  /** この目標向けの「一動作」例。小さくしたいときのヒントに使う。 */
  examples: string[];
  createdAt: number;
  archived: boolean;
}

export type StepOutcome = "done" | "stopped";

/** 一回の「一歩」の記録。エビデンスとして残す。 */
export interface StepLog {
  id: string;
  goalId: string;
  goalTitle: string;
  action: string;
  startedAt: number;
  /** 実際に手を動かした秒数 */
  durationSec: number;
  outcome: StepOutcome;
  /** 止めたときに書いた「次にやる一動作」 */
  nextActionMemo: string;
  /** 一歩やって見えたこと(任意) */
  note: string;
}

export interface AppData {
  schemaVersion: 1;
  goals: Goal[];
  logs: StepLog[];
  defaultMinutes: number;
}
