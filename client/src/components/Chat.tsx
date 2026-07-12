import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Project } from "../types";
import { useHiramekiStore } from "../store";
import type { ChatController } from "../lib/useChatController";

interface ChatProps {
  project: Project;
  controller: ChatController;
}

export default function Chat({ project, controller }: ChatProps): JSX.Element {
  const messages = useHiramekiStore((s) => s.messages);
  const projectMessages = messages
    .filter((m) => m.projectId === project.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [projectMessages.length, controller.streamingText]);

  const healthKnown = controller.health !== null;
  const hasApiKey = controller.health?.hasApiKey ?? false;

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!hasApiKey || controller.sending) return;
    controller.sendMessage(draft);
    setDraft("");
    // T12: スマホでフォーカスが残ったままだと画面がズームしたまま寄って
    // 戻らないことがあるため、送信後は明示的にblurして画面位置をリセットする。
    if (window.matchMedia("(max-width: 899px)").matches) {
      textareaRef.current?.blur();
    }
  }

  return (
    <section className="chat-panel">
      <div className="chat-messages" ref={listRef}>
        {projectMessages.length === 0 && controller.streamingText.length === 0 && (
          <p className="chat-empty">
            まだ会話がありません。アイデアは頭の中でひとりでに生まれたりしない——今考えていることを、まず話しかけてみましょう。
          </p>
        )}
        {projectMessages.map((m) => (
          <div key={m.id} className={`chat-bubble chat-bubble--${m.role}`}>
            <p>{m.content}</p>
          </div>
        ))}
        {controller.streamingText.length > 0 && (
          <div className="chat-bubble chat-bubble--assistant chat-bubble--streaming">
            <p>{controller.streamingText}</p>
          </div>
        )}
        {controller.sending && controller.streamingText.length === 0 && (
          <div className="chat-bubble chat-bubble--assistant chat-bubble--streaming">
            <span className="typing-indicator" aria-label="botが考えています">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
      </div>

      {controller.errorMessage && (
        <div className="chat-error">
          <span>エラー: {controller.errorMessage}</span>
          {controller.canResend && (
            <button type="button" onClick={controller.resend}>
              再送
            </button>
          )}
        </div>
      )}

      {healthKnown && !hasApiKey && (
        <div className="chat-setup-card">
          <p>
            <strong>APIキーが未設定です。</strong>
          </p>
          <p>
            右上の設定(歯車アイコン)からAnthropicのAPIキーを入力してください。
          </p>
          <p>
            キーはこの端末のlocalStorageにのみ保存され、Anthropic以外には送信されません。設定後すぐにチャットが利用できます。ワークベンチ(素材カード・組み合わせ・閃きメモ)はキーなしでも利用できます。
          </p>
        </div>
      )}

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={hasApiKey ? "botに話しかける..." : "APIキー未設定のため送信できません"}
          disabled={!hasApiKey || controller.sending}
          rows={2}
        />
        <div className="chat-input-actions">
          <button
            type="submit"
            disabled={!hasApiKey || controller.sending || draft.trim().length === 0}
          >
            送信
          </button>
          <button
            type="button"
            disabled={!hasApiKey || controller.extracting}
            onClick={controller.runExtract}
          >
            {controller.extracting ? "抽出中..." : "素材を抽出"}
          </button>
        </div>
      </form>
      {controller.extractError && (
        <p className="chat-extract-error">抽出エラー: {controller.extractError}</p>
      )}
    </section>
  );
}
