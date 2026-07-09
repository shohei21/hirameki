// T9 (BYOK化): ブラウザから直接Anthropic APIを呼び出すクライアント。
// server/ は廃止。APIキーはユーザーが設定画面で入力し、この端末の localStorage にのみ保存される。
// DESIGN.md §4/§6 のプロンプト・リクエスト仕様を維持したまま、SDKを `new Anthropic({apiKey, dangerouslyAllowBrowser: true})` で直接呼ぶ。

import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, MaterialCard, Stage, HiramekiModel } from "../types";
import { SYSTEM_BLOCK_1, buildContext } from "./prompts";

export interface ChatRequestMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatCardInput {
  kind: MaterialCard["kind"];
  text: string;
}

export interface ChatCombinationInput {
  note: string;
}

export interface ChatSparkInput {
  text: string;
}

export interface ChatRequestPayload {
  stage: Stage;
  question: string;
  cards: ChatCardInput[];
  combinations: ChatCombinationInput[];
  sparks: ChatSparkInput[];
  messages: ChatRequestMessage[];
}

export interface ExtractedCard {
  kind: MaterialCard["kind"];
  text: string;
}

export type ExtractResult =
  | { ok: true; cards: ExtractedCard[]; truncated: boolean }
  | { ok: false; error: string };

export interface ChatStreamHandlers {
  onDelta: (text: string) => void;
  onDone: (stopReason: string | null) => void;
  onError: (message: string) => void;
}

const MAX_ROUND_TRIPS = 30;
const MAX_CONTEXT_CARDS = 50;

/**
 * 会話履歴を直近 MAX_ROUND_TRIPS 往復に切り出す。
 *
 * 引き継ぎ事項: Anthropic API は user/assistant 交互を要求するため、
 * 履歴は必ず role:"user" から始まる必要がある(先頭がassistantだと
 * 「連続するuserロール」が発生してAPIエラーになる)。
 * そのため、ここでの切り出しは単純な件数(メッセージ数)ではなく
 * **user発言の境界**で行い、結果が必ず role:"user" から始まるようにする。
 * BYOK化後もこの制約は変わらない(呼び先がserver経由からSDK直呼びに変わっただけ)。
 */
export function buildChatMessages(messages: ChatMessage[]): ChatRequestMessage[] {
  const sorted = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const userIndices: number[] = [];
  sorted.forEach((m, i) => {
    if (m.role === "user") userIndices.push(i);
  });
  if (userIndices.length === 0) return [];

  const cutIndex =
    userIndices.length > MAX_ROUND_TRIPS
      ? (userIndices[userIndices.length - MAX_ROUND_TRIPS] as number)
      : (userIndices[0] as number);

  return sorted.slice(cutIndex).map((m) => ({ role: m.role, content: m.content }));
}

/** 素材カードを最大 MAX_CONTEXT_CARDS 件(新しい順)にクライアント側で切る。 */
export function selectRecentCards(cards: MaterialCard[]): ChatCardInput[] {
  const sorted = [...cards].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const trimmed =
    sorted.length > MAX_CONTEXT_CARDS ? sorted.slice(-MAX_CONTEXT_CARDS) : sorted;
  return trimmed.map((c) => ({ kind: c.kind, text: c.text }));
}

function buildClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

/** SDKの型付き例外で分岐する(文字列マッチは禁止)。 */
function formatAnthropicError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "APIキーが無効です";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "レート制限。少し待って再送してください";
  }
  if (err instanceof Anthropic.APIError) {
    return `${err.status ?? "unknown"}: ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "unknown_error";
}

/**
 * チャット送信。client.messages.stream() + thinking:adaptive + systemブロックへの
 * cache_control で DESIGN.md §4 の仕様を維持する。temperature/budget_tokens は使わない。
 */
export async function streamChat(
  apiKey: string,
  model: HiramekiModel,
  payload: ChatRequestPayload,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  if (apiKey.trim().length === 0) {
    handlers.onError("no_api_key");
    return;
  }

  const contextText = buildContext({
    stage: payload.stage,
    question: payload.question,
    cards: payload.cards,
    combinations: payload.combinations,
    sparks: payload.sparks,
  });

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `${contextText}\n\n${payload.messages[0]?.content ?? ""}`,
    },
    ...payload.messages.slice(1).map(
      (m): Anthropic.MessageParam => ({
        role: m.role,
        content: m.content,
      }),
    ),
  ];

  try {
    const client = buildClient(apiKey);
    const stream = client.messages.stream(
      {
        model,
        max_tokens: 4096,
        thinking: { type: "adaptive" },
        system: [
          {
            type: "text",
            text: SYSTEM_BLOCK_1,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages,
      },
      signal ? { signal } : undefined,
    );

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        handlers.onDelta(event.delta.text);
      }
    }

    const finalMessage = await stream.finalMessage();
    handlers.onDone(finalMessage.stop_reason);
  } catch (err) {
    handlers.onError(formatAnthropicError(err));
  }
}

/**
 * 会話ログから素材カード候補を抽出する。messages.create() + output_config.format(json_schema)。
 */
export async function extractCards(
  apiKey: string,
  model: HiramekiModel,
  messages: ChatRequestMessage[],
): Promise<ExtractResult> {
  if (apiKey.trim().length === 0) {
    return { ok: false, error: "no_api_key" };
  }

  try {
    const client = buildClient(apiKey);
    const conversationText = messages
      .map((m) => `${m.role === "user" ? "ユーザー" : "アシスタント"}: ${m.content}`)
      .join("\n");

    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: `あなたは会話ログから素材カード候補を抽出するアシスタントです。会話の中に含まれる、特殊資料(課題そのものに関する具体的な事実・観察・経験)と一般資料(課題とは一見無関係だが面白い連想・雑多な知識)を見つけ、それぞれ短い1文のカードとして抽出してください。`,
        },
      ],
      messages: [
        {
          role: "user",
          content: `以下の会話ログから素材カード候補を抽出してください。\n\n${conversationText}`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              cards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    kind: { type: "string", enum: ["specific", "general"] },
                    text: { type: "string" },
                  },
                  required: ["kind", "text"],
                  additionalProperties: false,
                },
              },
            },
            required: ["cards"],
            additionalProperties: false,
          },
        },
      },
    });

    const truncated = response.stop_reason === "max_tokens";
    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );

    if (!textBlock) {
      return { ok: true, cards: [], truncated: true };
    }

    const parsed: unknown = JSON.parse(textBlock.text);
    const cards = extractCardsFromParsed(parsed);
    return { ok: true, cards, truncated };
  } catch (err) {
    return { ok: false, error: formatAnthropicError(err) };
  }
}

function extractCardsFromParsed(parsed: unknown): ExtractedCard[] {
  if (typeof parsed !== "object" || parsed === null) return [];
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj["cards"])) return [];
  const result: ExtractedCard[] = [];
  for (const item of obj["cards"]) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const kind = rec["kind"];
    const text = rec["text"];
    if (
      (kind === "specific" || kind === "general") &&
      typeof text === "string"
    ) {
      result.push({ kind, text });
    }
  }
  return result;
}
