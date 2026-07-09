// localStorageリポジトリ層。キーは `hirameki:v1:<entity>`。
// schemaVersion付きエンベロープを持ち、将来のマイグレーションに備える。
// JSON破損時は空配列で初期化し、consoleに警告を出す。

import type {
  Project,
  MaterialCard,
  Combination,
  Spark,
  ChatMessage,
  Settings,
  HiramekiModel,
} from "../types";

const SCHEMA_VERSION = 1;
const STORAGE_PREFIX = "hirameki:v1:";
const MAX_MESSAGES_PER_PROJECT = 500;

const DEFAULT_MODEL: HiramekiModel = "claude-opus-4-8";
const DEFAULT_SETTINGS: Settings = { apiKey: "", model: DEFAULT_MODEL };

function isHiramekiModel(value: unknown): value is HiramekiModel {
  return value === "claude-opus-4-8" || value === "claude-sonnet-5";
}

/** 破損・旧形式のsettingsでも安全なデフォルトへフォールバックする。 */
function sanitizeSettings(value: unknown): Settings {
  if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
  const v = value as Record<string, unknown>;
  return {
    apiKey: typeof v["apiKey"] === "string" ? v["apiKey"] : "",
    model: isHiramekiModel(v["model"]) ? v["model"] : DEFAULT_MODEL,
  };
}

interface StorageEnvelope<T> {
  schemaVersion: number;
  data: T;
}

function keyFor(entity: string): string {
  return `${STORAGE_PREFIX}${entity}`;
}

function isEnvelope(value: unknown): value is StorageEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    "data" in value
  );
}

/** entity を読み込む。キーがない場合やJSON破損時は fallback を返す(破損時はconsole.warn)。 */
export function loadEntity<T>(entity: string, fallback: T): T {
  const key = keyFor(entity);
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch (err) {
    console.warn(`[hirameki:storage] localStorage unavailable for "${entity}"`, err);
    return fallback;
  }
  if (raw === null) return fallback;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isEnvelope(parsed)) {
      console.warn(
        `[hirameki:storage] invalid envelope shape for "${entity}"; resetting to empty`,
      );
      return fallback;
    }
    return parsed.data as T;
  } catch (err) {
    console.warn(
      `[hirameki:storage] failed to parse JSON for "${entity}"; resetting to empty`,
      err,
    );
    return fallback;
  }
}

/** entity を保存する。 */
export function saveEntity<T>(entity: string, data: T): void {
  const key = keyFor(entity);
  const envelope: StorageEnvelope<T> = { schemaVersion: SCHEMA_VERSION, data };
  localStorage.setItem(key, JSON.stringify(envelope));
}

/**
 * プロジェクトごとに最大 MAX_MESSAGES_PER_PROJECT 件まで、
 * createdAt が新しいものを残して古いものから間引く。
 */
export function trimMessagesPerProject(messages: ChatMessage[]): ChatMessage[] {
  const byProject = new Map<string, ChatMessage[]>();
  for (const message of messages) {
    const list = byProject.get(message.projectId);
    if (list) {
      list.push(message);
    } else {
      byProject.set(message.projectId, [message]);
    }
  }

  const result: ChatMessage[] = [];
  for (const list of byProject.values()) {
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const trimmed =
      sorted.length > MAX_MESSAGES_PER_PROJECT
        ? sorted.slice(sorted.length - MAX_MESSAGES_PER_PROJECT)
        : sorted;
    result.push(...trimmed);
  }
  // 元の相対順序に近づけるため createdAt でソートして返す
  result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return result;
}

export const projectsRepo = {
  load: (): Project[] => loadEntity<Project[]>("projects", []),
  save: (projects: Project[]): void => saveEntity<Project[]>("projects", projects),
};

export const cardsRepo = {
  load: (): MaterialCard[] => loadEntity<MaterialCard[]>("cards", []),
  save: (cards: MaterialCard[]): void => saveEntity<MaterialCard[]>("cards", cards),
};

export const combinationsRepo = {
  load: (): Combination[] => loadEntity<Combination[]>("combinations", []),
  save: (combinations: Combination[]): void =>
    saveEntity<Combination[]>("combinations", combinations),
};

export const sparksRepo = {
  load: (): Spark[] => loadEntity<Spark[]>("sparks", []),
  save: (sparks: Spark[]): void => saveEntity<Spark[]>("sparks", sparks),
};

export const messagesRepo = {
  load: (): ChatMessage[] => loadEntity<ChatMessage[]>("messages", []),
  save: (messages: ChatMessage[]): void =>
    saveEntity<ChatMessage[]>("messages", trimMessagesPerProject(messages)),
};

export const activeProjectRepo = {
  load: (): string | null => loadEntity<string | null>("activeProjectId", null),
  save: (id: string | null): void => saveEntity<string | null>("activeProjectId", id),
};

export const settingsRepo = {
  load: (): Settings => sanitizeSettings(loadEntity<unknown>("settings", DEFAULT_SETTINGS)),
  save: (settings: Settings): void => saveEntity<Settings>("settings", settings),
};
