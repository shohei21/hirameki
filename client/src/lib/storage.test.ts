import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  projectsRepo,
  messagesRepo,
  trimMessagesPerProject,
} from "./storage";
import type { Project, ChatMessage } from "../types";

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

describe("storage round-trip", () => {
  it("saves and loads projects", () => {
    const project = makeProject();
    projectsRepo.save([project]);
    const loaded = projectsRepo.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual(project);
  });

  it("returns empty array when key does not exist", () => {
    expect(projectsRepo.load()).toEqual([]);
  });
});

describe("storage corruption handling", () => {
  it("resets to empty array on malformed JSON", () => {
    localStorage.setItem("hirameki:v1:projects", "{not valid json");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const loaded = projectsRepo.load();
    expect(loaded).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("resets to empty array when envelope shape is invalid", () => {
    localStorage.setItem("hirameki:v1:projects", JSON.stringify({ foo: "bar" }));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const loaded = projectsRepo.load();
    expect(loaded).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("message trimming (500 per project)", () => {
  it("keeps at most 500 messages per project, dropping the oldest", () => {
    const base = Date.now();
    const messages: ChatMessage[] = Array.from({ length: 520 }, (_, i) =>
      makeMessage({
        id: `m${i}`,
        content: `message ${i}`,
        createdAt: new Date(base + i * 1000).toISOString(),
      }),
    );
    const trimmed = trimMessagesPerProject(messages);
    expect(trimmed).toHaveLength(500);
    // oldest 20 should be dropped, so message 0..19 must be gone
    expect(trimmed.some((m) => m.id === "m0")).toBe(false);
    expect(trimmed.some((m) => m.id === "m19")).toBe(false);
    // newest ones should remain
    expect(trimmed.some((m) => m.id === "m519")).toBe(true);
    expect(trimmed.some((m) => m.id === "m20")).toBe(true);
  });

  it("does not trim messages under the cap, and keeps other projects independent", () => {
    const base = Date.now();
    const p1 = Array.from({ length: 10 }, (_, i) =>
      makeMessage({
        id: `p1-${i}`,
        projectId: "p1",
        createdAt: new Date(base + i * 1000).toISOString(),
      }),
    );
    const p2 = Array.from({ length: 600 }, (_, i) =>
      makeMessage({
        id: `p2-${i}`,
        projectId: "p2",
        createdAt: new Date(base + i * 1000).toISOString(),
      }),
    );
    const trimmed = trimMessagesPerProject([...p1, ...p2]);
    const p1Trimmed = trimmed.filter((m) => m.projectId === "p1");
    const p2Trimmed = trimmed.filter((m) => m.projectId === "p2");
    expect(p1Trimmed).toHaveLength(10);
    expect(p2Trimmed).toHaveLength(500);
  });

  it("messagesRepo.save persists a trimmed list", () => {
    const base = Date.now();
    const messages: ChatMessage[] = Array.from({ length: 505 }, (_, i) =>
      makeMessage({
        id: `m${i}`,
        createdAt: new Date(base + i * 1000).toISOString(),
      }),
    );
    messagesRepo.save(messages);
    const loaded = messagesRepo.load();
    expect(loaded).toHaveLength(500);
  });
});
