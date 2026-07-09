import { describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "../types";

// T9 (BYOK化): SDKを直接呼ぶため、@anthropic-ai/sdk をモックしてキー未設定・401(無効キー)・
// 429(レート制限)分岐を型付き例外ベースで検証する。
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.status = status;
    }
  }
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}

  class MockAnthropic {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
    messages: {
      stream: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    constructor() {
      this.messages = {
        stream: vi.fn(() => {
          throw new AuthenticationError("invalid x-api-key", 401);
        }),
        create: vi.fn(() =>
          Promise.reject(new RateLimitError("rate limited", 429)),
        ),
      };
    }
  }

  return { default: MockAnthropic };
});

const { buildChatMessages, streamChat, extractCards } = await import("./api");

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

describe("buildChatMessages (user境界でのトリミング)", () => {
  it("先頭がassistantで始まる壊れた履歴でも、先頭のuserより前を落として必ずuserから始まる", () => {
    const base = Date.now();
    const messages: ChatMessage[] = [
      makeMessage({ id: "a0", role: "assistant", createdAt: new Date(base).toISOString() }),
      makeMessage({ id: "u1", role: "user", createdAt: new Date(base + 1000).toISOString() }),
      makeMessage({ id: "a1", role: "assistant", createdAt: new Date(base + 2000).toISOString() }),
    ];
    const result = buildChatMessages(messages);
    expect(result[0]?.role).toBe("user");
    expect(result).toHaveLength(2);
  });

  it("履歴が空、またはuserが1件もない場合は空配列を返す", () => {
    expect(buildChatMessages([])).toEqual([]);
    const onlyAssistant: ChatMessage[] = [
      makeMessage({ id: "a0", role: "assistant" }),
    ];
    expect(buildChatMessages(onlyAssistant)).toEqual([]);
  });

  it("30往復を超える場合、直近30件のuserターン境界で切り、先頭は必ずuser。ターンの区切りを壊さない", () => {
    const base = Date.now();
    const messages: ChatMessage[] = [];
    let t = base;
    // ターン1だけassistantが3件連続する変則的な往復にして、
    // 「メッセージ件数で単純に後ろからスライスする」実装だと境界がズレることを確認する。
    messages.push(
      makeMessage({ id: "u1", role: "user", content: "u1", createdAt: new Date(t++).toISOString() }),
    );
    messages.push(
      makeMessage({ id: "a1a", role: "assistant", content: "a1a", createdAt: new Date(t++).toISOString() }),
    );
    messages.push(
      makeMessage({ id: "a1b", role: "assistant", content: "a1b", createdAt: new Date(t++).toISOString() }),
    );
    messages.push(
      makeMessage({ id: "a1c", role: "assistant", content: "a1c", createdAt: new Date(t++).toISOString() }),
    );
    // ターン2〜35(34ターン)は通常の1往復ずつ
    for (let i = 2; i <= 35; i++) {
      messages.push(
        makeMessage({
          id: `u${i}`,
          role: "user",
          content: `u${i}`,
          createdAt: new Date(t++).toISOString(),
        }),
      );
      messages.push(
        makeMessage({
          id: `a${i}`,
          role: "assistant",
          content: `a${i}`,
          createdAt: new Date(t++).toISOString(),
        }),
      );
    }

    const result = buildChatMessages(messages);

    // 先頭は必ずuser
    expect(result[0]?.role).toBe("user");

    // userメッセージはちょうど30件残る(直近30往復)
    const userCount = result.filter((m) => m.role === "user").length;
    expect(userCount).toBe(30);

    // 変則的な最初のターン(u1, a1a, a1b, a1c)は古すぎるので一切含まれない
    const contents = new Set(result.map((m) => m.content));
    expect(contents.has("u1")).toBe(false);
    expect(contents.has("a1a")).toBe(false);
    expect(contents.has("a1b")).toBe(false);
    expect(contents.has("a1c")).toBe(false);

    // 直近30往復(ターン6〜35)はすべて含まれる
    expect(contents.has("u6")).toBe(true);
    expect(contents.has("a6")).toBe(true);
    expect(contents.has("u35")).toBe(true);
    expect(contents.has("a35")).toBe(true);
    // ターン5(境界の外側)は含まれない
    expect(contents.has("u5")).toBe(false);
  });
});

const BASE_PAYLOAD = {
  stage: "gather" as const,
  question: "課題",
  cards: [],
  combinations: [],
  sparks: [],
  messages: [{ role: "user" as const, content: "こんにちは" }],
};

describe("streamChat (BYOK: SDK直呼び)", () => {
  it("APIキー未設定なら SDK を呼ばずに onError('no_api_key')", async () => {
    const onError = vi.fn();
    await streamChat("", "claude-opus-4-8", BASE_PAYLOAD, {
      onDelta: vi.fn(),
      onDone: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledWith("no_api_key");
  });

  it("無効なAPIキー(401 AuthenticationError)は「APIキーが無効です」に分岐する", async () => {
    const onError = vi.fn();
    await streamChat("sk-ant-invalid", "claude-opus-4-8", BASE_PAYLOAD, {
      onDelta: vi.fn(),
      onDone: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledWith("APIキーが無効です");
  });
});

describe("extractCards (BYOK: SDK直呼び)", () => {
  it("APIキー未設定なら no_api_key を返す", async () => {
    const result = await extractCards("", "claude-opus-4-8", []);
    expect(result).toEqual({ ok: false, error: "no_api_key" });
  });

  it("429 RateLimitError は「レート制限。少し待って再送してください」に分岐する", async () => {
    const result = await extractCards("sk-ant-valid", "claude-opus-4-8", [
      { role: "user", content: "test" },
    ]);
    expect(result).toEqual({
      ok: false,
      error: "レート制限。少し待って再送してください",
    });
  });
});
