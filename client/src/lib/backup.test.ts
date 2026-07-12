import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildBackup, validateBackup, applyBackup, backupFileName } from "./backup";
import { projectsRepo, cardsRepo, messagesRepo, settingsRepo } from "./storage";
import type { Project, MaterialCard, ChatMessage } from "../types";

// backup.ts は document/URL などブラウザAPIに触れる downloadBackup を除き、
// node環境(vitestのtest.environment: "node")でも検証できる範囲をテストする。

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
});

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: crypto.randomUUID(),
    title: "テストプロジェクト",
    question: "課題文",
    stage: "gather",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeCard(overrides: Partial<MaterialCard> = {}): MaterialCard {
  return {
    id: crypto.randomUUID(),
    projectId: "p1",
    kind: "specific",
    text: "カード本文",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: crypto.randomUUID(),
    projectId: "p1",
    role: "user",
    content: "hello",
    stage: "gather",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("backupFileName", () => {
  it("hirameki-backup-YYYYMMDD.json の形式になる", () => {
    const date = new Date(2026, 6, 9); // 2026-07-09 (月は0始まり)
    expect(backupFileName(date)).toBe("hirameki-backup-20260709.json");
  });
});

describe("buildBackup / validateBackup round-trip", () => {
  it("エクスポート→インポートで元のデータが復元される", () => {
    const project = makeProject();
    const card = makeCard({ projectId: project.id });
    const message = makeMessage({ projectId: project.id });
    projectsRepo.save([project]);
    cardsRepo.save([card]);
    messagesRepo.save([message]);

    const backup = buildBackup();
    expect(backup.projects).toEqual([project]);
    expect(backup.cards).toEqual([card]);
    expect(backup.messages).toEqual([message]);

    // JSONシリアライズ/デシリアライズを経由しても壊れないことを確認する
    const roundTripped: unknown = JSON.parse(JSON.stringify(backup));
    const result = validateBackup(roundTripped);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.projects).toEqual([project]);
    expect(result.data.cards).toEqual([card]);
    expect(result.data.messages).toEqual([message]);
  });

  it("settings(APIキー)はバックアップに含まれない", () => {
    settingsRepo.save({ apiKey: "sk-ant-secret", model: "claude-opus-4-8", effort: "low" });
    const backup = buildBackup();
    expect(JSON.stringify(backup)).not.toContain("sk-ant-secret");
    expect("settings" in backup).toBe(false);
  });

  it("applyBackupでlocalStorageの内容が上書きされる(settingsは触らない)", () => {
    settingsRepo.save({ apiKey: "sk-ant-should-survive", model: "claude-opus-4-8", effort: "low" });
    const project = makeProject({ id: "new-project" });
    applyBackup({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      projects: [project],
      cards: [],
      combinations: [],
      sparks: [],
      messages: [],
    });
    expect(projectsRepo.load()).toEqual([project]);
    expect(settingsRepo.load().apiKey).toBe("sk-ant-should-survive");
  });
});

describe("validateBackup: 不正なデータの拒否", () => {
  it("オブジェクトでない値は拒否される", () => {
    const result = validateBackup("not an object");
    expect(result.ok).toBe(false);
  });

  it("schemaVersionが無いと拒否される", () => {
    const result = validateBackup({ projects: [], cards: [], combinations: [], sparks: [], messages: [] });
    expect(result.ok).toBe(false);
  });

  it("projectsが配列でないと拒否される", () => {
    const result = validateBackup({
      schemaVersion: 1,
      projects: "not-an-array",
      cards: [],
      combinations: [],
      sparks: [],
      messages: [],
    });
    expect(result.ok).toBe(false);
  });

  it("cardのkindが不正な値だと拒否される", () => {
    const result = validateBackup({
      schemaVersion: 1,
      projects: [],
      cards: [{ id: "1", projectId: "p1", kind: "invalid-kind", text: "x", createdAt: "now" }],
      combinations: [],
      sparks: [],
      messages: [],
    });
    expect(result.ok).toBe(false);
  });

  it("必須フィールドが欠けたprojectは拒否される", () => {
    const result = validateBackup({
      schemaVersion: 1,
      projects: [{ id: "1", title: "no question or stage" }],
      cards: [],
      combinations: [],
      sparks: [],
      messages: [],
    });
    expect(result.ok).toBe(false);
  });
});
