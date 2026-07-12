// T12: データのエクスポート/インポート。
// バックアップ対象は projects/cards/combinations/sparks/messages/schemaVersion のみ。
// settings(APIキー)はバックアップファイル経由のキー流出を防ぐため意図的に含めない。

import type {
  Project,
  MaterialCard,
  Combination,
  Spark,
  ChatMessage,
} from "../types";
import {
  projectsRepo,
  cardsRepo,
  combinationsRepo,
  sparksRepo,
  messagesRepo,
  SCHEMA_VERSION,
} from "./storage";

export interface BackupData {
  schemaVersion: number;
  exportedAt: string;
  projects: Project[];
  cards: MaterialCard[];
  combinations: Combination[];
  sparks: Spark[];
  messages: ChatMessage[];
}

/** 現在のlocalStorageの内容から、settingsを除いたバックアップデータを組み立てる。 */
export function buildBackup(): BackupData {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    projects: projectsRepo.load(),
    cards: cardsRepo.load(),
    combinations: combinationsRepo.load(),
    sparks: sparksRepo.load(),
    messages: messagesRepo.load(),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `hirameki-backup-YYYYMMDD.json` というファイル名。 */
export function backupFileName(date: Date = new Date()): string {
  return `hirameki-backup-${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}.json`;
}

/** Blob + aタグでバックアップJSONをダウンロードさせる。 */
export function downloadBackup(backup: BackupData): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type ValidateResult =
  | { ok: true; data: BackupData }
  | { ok: false; error: string };

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isProject(v: unknown): v is Project {
  if (!isRecord(v)) return false;
  return (
    isString(v["id"]) &&
    isString(v["title"]) &&
    isString(v["question"]) &&
    isString(v["stage"]) &&
    isString(v["createdAt"]) &&
    isString(v["updatedAt"])
  );
}

function isMaterialCard(v: unknown): v is MaterialCard {
  if (!isRecord(v)) return false;
  return (
    isString(v["id"]) &&
    isString(v["projectId"]) &&
    (v["kind"] === "specific" || v["kind"] === "general") &&
    isString(v["text"]) &&
    isString(v["createdAt"])
  );
}

function isCombination(v: unknown): v is Combination {
  if (!isRecord(v)) return false;
  return (
    isString(v["id"]) &&
    isString(v["projectId"]) &&
    Array.isArray(v["cardIds"]) &&
    v["cardIds"].every((c) => typeof c === "string") &&
    isString(v["note"]) &&
    isString(v["createdAt"])
  );
}

function isSpark(v: unknown): v is Spark {
  if (!isRecord(v)) return false;
  return (
    isString(v["id"]) &&
    isString(v["projectId"]) &&
    isString(v["text"]) &&
    isString(v["createdAt"])
  );
}

function isChatMessage(v: unknown): v is ChatMessage {
  if (!isRecord(v)) return false;
  return (
    isString(v["id"]) &&
    isString(v["projectId"]) &&
    (v["role"] === "user" || v["role"] === "assistant") &&
    isString(v["content"]) &&
    isString(v["stage"]) &&
    isString(v["createdAt"])
  );
}

/** インポートされたJSONの構造検証。不正なら理由付きで失敗を返す。 */
export function validateBackup(parsed: unknown): ValidateResult {
  if (!isRecord(parsed)) {
    return { ok: false, error: "ファイルの形式が不正です(JSONオブジェクトではありません)" };
  }
  if (typeof parsed["schemaVersion"] !== "number") {
    return { ok: false, error: "schemaVersionが見つかりません" };
  }

  const projects = parsed["projects"];
  const cards = parsed["cards"];
  const combinations = parsed["combinations"];
  const sparks = parsed["sparks"];
  const messages = parsed["messages"];

  if (!Array.isArray(projects) || !projects.every(isProject)) {
    return { ok: false, error: "projectsの形式が不正です" };
  }
  if (!Array.isArray(cards) || !cards.every(isMaterialCard)) {
    return { ok: false, error: "cardsの形式が不正です" };
  }
  if (!Array.isArray(combinations) || !combinations.every(isCombination)) {
    return { ok: false, error: "combinationsの形式が不正です" };
  }
  if (!Array.isArray(sparks) || !sparks.every(isSpark)) {
    return { ok: false, error: "sparksの形式が不正です" };
  }
  if (!Array.isArray(messages) || !messages.every(isChatMessage)) {
    return { ok: false, error: "messagesの形式が不正です" };
  }

  return {
    ok: true,
    data: {
      schemaVersion: parsed["schemaVersion"],
      exportedAt: isString(parsed["exportedAt"]) ? parsed["exportedAt"] : "",
      projects,
      cards,
      combinations,
      sparks,
      messages,
    },
  };
}

/** 検証済みバックアップデータでlocalStorageを上書きする(settingsは一切触らない)。 */
export function applyBackup(data: BackupData): void {
  projectsRepo.save(data.projects);
  cardsRepo.save(data.cards);
  combinationsRepo.save(data.combinations);
  sparksRepo.save(data.sparks);
  messagesRepo.save(data.messages);
}
