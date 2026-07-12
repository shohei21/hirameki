// Chat と Workbench で共有する、チャット送受信のエフェメラル状態(store永続化はしない)。
// store の `streaming` フラグは既存のZustand storeをそのまま利用する。
// T9 (BYOK化): サーバーの /api/health 相当は廃止し、store の settings (localStorage保存)から
// 同期的に「キー有無・選択モデル」を導出する。ネットワーク呼び出しは不要になった。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "../types";
import { useHiramekiStore } from "../store";
import {
  buildChatMessages,
  buildContinuationPrompt,
  extractCards,
  selectRecentCards,
  streamChat,
  type ExtractedCard,
} from "./api";

export interface ChatHealth {
  hasApiKey: boolean;
  model: string;
}

export interface ChatController {
  health: ChatHealth | null;
  sending: boolean;
  streamingText: string;
  errorMessage: string | null;
  // T13(中断対策c): エラーによる中断・max_tokensによる一区切りのどちらでも、
  // 直前までの部分応答から「続きから再開」できる状態かどうか。
  canContinue: boolean;
  sendMessage: (text: string) => void;
  continueFromInterruption: () => void;
  candidates: ExtractedCard[];
  extracting: boolean;
  extractError: string | null;
  runExtract: () => void;
  approveCandidate: (index: number) => void;
  discardCandidate: (index: number) => void;
}

/** T13(中断対策c): 中断/一区切りの種別に応じたメッセージ末尾の注記。 */
const INTERRUPTED_NOTE = "(中断されました)";
const MAX_TOKENS_NOTE = "(長くなったため一区切りしました)";

export function useChatController(project: Project | null): ChatController {
  const messages = useHiramekiStore((s) => s.messages);
  const cards = useHiramekiStore((s) => s.cards);
  const combinations = useHiramekiStore((s) => s.combinations);
  const sparks = useHiramekiStore((s) => s.sparks);
  const addMessage = useHiramekiStore((s) => s.addMessage);
  const addCard = useHiramekiStore((s) => s.addCard);
  const streaming = useHiramekiStore((s) => s.streaming);
  const setStreaming = useHiramekiStore((s) => s.setStreaming);
  const settings = useHiramekiStore((s) => s.settings);

  const health = useMemo<ChatHealth>(
    () => ({ hasApiKey: settings.apiKey.trim().length > 0, model: settings.model }),
    [settings],
  );

  const [streamingText, setStreamingText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canContinue, setCanContinue] = useState(false);
  const [candidates, setCandidates] = useState<ExtractedCard[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const streamBufferRef = useRef("");
  const lastUserTextRef = useRef<string | null>(null);
  // T13(中断対策c): 中断/一区切り時点の「生の」部分応答(注記文言を含まない)。
  // 「続きから再開」の際、この末尾80文字を引用したuserターンを組み立てる。
  const lastInterruptedPartialRef = useRef<string>("");

  const projectId = project?.id ?? null;

  useEffect(() => {
    // プロジェクト切り替え時にエフェメラル状態をリセットする
    setCandidates([]);
    setExtractError(null);
    setErrorMessage(null);
    setCanContinue(false);
    streamBufferRef.current = "";
    setStreamingText("");
    lastUserTextRef.current = null;
    lastInterruptedPartialRef.current = "";
  }, [projectId]);

  // T13(中断対策b): ストリーミング中は画面消灯を防止する。非対応ブラウザ(iOS旧版等)では
  // navigator.wakeLock 自体が存在しないかrequestが例外を投げるため、try/catchで無視する。
  // done/error(=streamingがfalseになる)や、タブが非表示になった瞬間にも確実にreleaseする。
  useEffect(() => {
    if (!streaming) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire(): Promise<void> {
      try {
        const lock = await navigator.wakeLock?.request("screen");
        if (cancelled) {
          // acquire完了までの間にstreamingがfalseになっていたら即release
          void lock?.release().catch(() => undefined);
          return;
        }
        sentinel = lock ?? null;
      } catch {
        // 非対応・拒否は黙って無視する
        sentinel = null;
      }
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "hidden") {
        void sentinel?.release().catch(() => undefined);
        sentinel = null;
      } else if (!cancelled) {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release().catch(() => undefined);
      sentinel = null;
    };
  }, [streaming]);

  const runSend = useCallback(
    (text: string, options?: { auto?: boolean }) => {
      if (!project) return;
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      if (!health.hasApiKey) return;

      lastUserTextRef.current = trimmed;
      addMessage(project.id, "user", trimmed, project.stage, options);
      setErrorMessage(null);
      setCanContinue(false);
      lastInterruptedPartialRef.current = "";
      setStreaming(true);
      streamBufferRef.current = "";
      setStreamingText("");

      const projectMessages = [
        ...messages.filter((m) => m.projectId === project.id),
        {
          id: "pending",
          projectId: project.id,
          role: "user" as const,
          content: trimmed,
          stage: project.stage,
          createdAt: new Date().toISOString(),
        },
      ];

      const payload = {
        stage: project.stage,
        question: project.question,
        cards: selectRecentCards(cards.filter((c) => c.projectId === project.id)),
        combinations: combinations
          .filter((c) => c.projectId === project.id)
          .map((c) => ({ note: c.note })),
        sparks: sparks
          .filter((s) => s.projectId === project.id)
          .map((s) => ({ text: s.text })),
        messages: buildChatMessages(projectMessages),
      };

      void streamChat(settings.apiKey, settings.model, settings.effort, payload, {
        onDelta: (delta) => {
          streamBufferRef.current += delta;
          setStreamingText(streamBufferRef.current);
        },
        onDone: (stopReason) => {
          const finalText = streamBufferRef.current;
          if (stopReason === "max_tokens") {
            // T13(中断対策c): max_tokensで終わった場合も「続きから再開」を出す。
            // エラーではないので errorMessage は立てない。
            lastInterruptedPartialRef.current = finalText;
            if (finalText.length > 0) {
              addMessage(
                project.id,
                "assistant",
                `${finalText}\n\n${MAX_TOKENS_NOTE}`,
                project.stage,
              );
            }
            setCanContinue(true);
          } else if (finalText.length > 0) {
            addMessage(project.id, "assistant", finalText, project.stage);
          }
          streamBufferRef.current = "";
          setStreamingText("");
          setStreaming(false);
        },
        onError: (message) => {
          const partial = streamBufferRef.current;
          lastInterruptedPartialRef.current = partial;
          if (partial.length > 0) {
            addMessage(
              project.id,
              "assistant",
              `${partial}\n\n${INTERRUPTED_NOTE}`,
              project.stage,
            );
          }
          streamBufferRef.current = "";
          setStreamingText("");
          setStreaming(false);
          setErrorMessage(message);
          setCanContinue(true);
        },
      });
    },
    [
      project,
      health,
      messages,
      cards,
      combinations,
      sparks,
      addMessage,
      setStreaming,
      settings,
    ],
  );

  const sendMessage = useCallback((text: string) => runSend(text), [runSend]);

  /**
   * T13(中断対策c): 「続きから再開」。assistantプレフィルは使わず、直前までの部分応答の
   * 末尾80文字を引用した継続指示のuserターンを自動送信する(履歴には auto:true 付きで保存)。
   * 部分応答が全く無い場合(APIキー無効など、ストリーミング開始前の失敗)は、続ける対象が
   * ないため直前のユーザー発言をそのまま再送する。
   */
  const continueFromInterruption = useCallback(() => {
    const partial = lastInterruptedPartialRef.current;
    if (partial.length > 0) {
      runSend(buildContinuationPrompt(partial), { auto: true });
      return;
    }
    const last = lastUserTextRef.current;
    if (last) runSend(last, { auto: true });
  }, [runSend]);

  const runExtract = useCallback(() => {
    if (!project) return;
    if (!health.hasApiKey) return;
    setExtracting(true);
    setExtractError(null);
    const projectMessages = messages.filter((m) => m.projectId === project.id);
    void extractCards(
      settings.apiKey,
      settings.model,
      buildChatMessages(projectMessages),
    ).then((result) => {
      setExtracting(false);
      if (!result.ok) {
        setExtractError(result.error);
        return;
      }
      setCandidates((prev) => [...prev, ...result.cards]);
    });
  }, [project, health, messages, settings]);

  const approveCandidate = useCallback(
    (index: number) => {
      if (!project) return;
      setCandidates((prev) => {
        const candidate = prev[index];
        if (!candidate) return prev;
        addCard(project.id, candidate.kind, candidate.text);
        return prev.filter((_, i) => i !== index);
      });
    },
    [project, addCard],
  );

  const discardCandidate = useCallback((index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    health,
    sending: streaming,
    streamingText,
    errorMessage,
    canContinue,
    sendMessage,
    continueFromInterruption,
    candidates,
    extracting,
    extractError,
    runExtract,
    approveCandidate,
    discardCandidate,
  };
}
