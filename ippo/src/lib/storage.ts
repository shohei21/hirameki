import type { AppData, Goal, StepLog } from "../types";
import { buildInitialGoals } from "./presets";

const STORAGE_KEY = "ippo:v1:data";

export function createInitialData(now: number): AppData {
  return { schemaVersion: 1, goals: buildInitialGoals(now), logs: [], defaultMinutes: 2 };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function sanitizeGoal(v: unknown): Goal | null {
  if (!isRecord(v) || typeof v["id"] !== "string" || typeof v["title"] !== "string") return null;
  return {
    id: v["id"],
    title: v["title"],
    nextAction: str(v["nextAction"]),
    examples: Array.isArray(v["examples"]) ? v["examples"].filter((e): e is string => typeof e === "string") : [],
    createdAt: num(v["createdAt"]),
    archived: v["archived"] === true,
  };
}

function sanitizeLog(v: unknown): StepLog | null {
  if (!isRecord(v) || typeof v["id"] !== "string") return null;
  return {
    id: v["id"],
    goalId: str(v["goalId"]),
    goalTitle: str(v["goalTitle"]),
    action: str(v["action"]),
    startedAt: num(v["startedAt"]),
    durationSec: num(v["durationSec"]),
    outcome: v["outcome"] === "stopped" ? "stopped" : "done",
    nextActionMemo: str(v["nextActionMemo"]),
    note: str(v["note"]),
  };
}

/** 保存データ(またはバックアップJSON)を検証して AppData にする。不正なら null。 */
export function parseData(raw: unknown): AppData | null {
  if (!isRecord(raw) || raw["schemaVersion"] !== 1) return null;
  if (!Array.isArray(raw["goals"]) || !Array.isArray(raw["logs"])) return null;
  const minutes = num(raw["defaultMinutes"], 2);
  return {
    schemaVersion: 1,
    goals: raw["goals"].map(sanitizeGoal).filter((g): g is Goal => g !== null),
    logs: raw["logs"].map(sanitizeLog).filter((l): l is StepLog => l !== null),
    defaultMinutes: minutes > 0 && minutes <= 60 ? minutes : 2,
  };
}

export function loadData(now: number): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return createInitialData(now);
    const parsed = parseData(JSON.parse(raw));
    if (parsed) return parsed;
    console.warn("[ippo:storage] 保存データが不正なため初期化します");
  } catch (err) {
    console.warn("[ippo:storage] 読み込みに失敗しました", err);
  }
  return createInitialData(now);
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("[ippo:storage] 保存に失敗しました", err);
  }
}
