// Chat と Workbench で共有する、チャット送受信のエフェメラル状態(store永続化はしない)。
// store の `streaming` フラグは既存のZustand storeをそのまま利用する。
// T9 (BYOK化): サーバーの /api/health 相当は廃止し、store の settings (localStorage保存)から
// 同期的に「キー有無・選択モデル」を導出する。ネットワーク呼び出しは不要になった。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "../types";
import { useHiramekiStore } from "../store";
import {
  buildChatMessages,
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
  canResend: boolean;
  sendMessage: (text: string) => void;
  resend: () => void;
  candidates: ExtractedCard[];
  extracting: boolean;
  extractError: string | null;
  runExtract: () => void;
  approveCandidate: (index: number) => void;
  discardCandidate: (index: number) => void;
}

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
  const [candidates, setCandidates] = useState<ExtractedCard[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const streamBufferRef = useRef("");
  const lastUserTextRef = useRef<string | null>(null);

  const projectId = project?.id ?? null;

  useEffect(() => {
    // プロジェクト切り替え時にエフェメラル状態をリセットする
    setCandidates([]);
    setExtractError(null);
    setErrorMessage(null);
    streamBufferRef.current = "";
    setStreamingText("");
    lastUserTextRef.current = null;
  }, [projectId]);

  const runSend = useCallback(
    (text: string) => {
      if (!project) return;
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      if (!health.hasApiKey) return;

      lastUserTextRef.current = trimmed;
      addMessage(project.id, "user", trimmed, project.stage);
      setErrorMessage(null);
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

      void streamChat(settings.apiKey, settings.model, payload, {
        onDelta: (delta) => {
          streamBufferRef.current += delta;
          setStreamingText(streamBufferRef.current);
        },
        onDone: () => {
          const finalText = streamBufferRef.current;
          if (finalText.length > 0) {
            addMessage(project.id, "assistant", finalText, project.stage);
          }
          streamBufferRef.current = "";
          setStreamingText("");
          setStreaming(false);
        },
        onError: (message) => {
          const partial = streamBufferRef.current;
          if (partial.length > 0) {
            addMessage(
              project.id,
              "assistant",
              `${partial}\n\n(中断されました)`,
              project.stage,
            );
          }
          streamBufferRef.current = "";
          setStreamingText("");
          setStreaming(false);
          setErrorMessage(message);
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

  const resend = useCallback(() => {
    const last = lastUserTextRef.current;
    if (last) runSend(last);
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
    canResend: errorMessage !== null && lastUserTextRef.current !== null,
    sendMessage,
    resend,
    candidates,
    extracting,
    extractError,
    runExtract,
    approveCandidate,
    discardCandidate,
  };
}
