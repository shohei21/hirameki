import { useState } from "react";
import { useHiramekiStore } from "../store";
import SettingsModal from "./SettingsModal";
import GuideModal from "./GuideModal";

export default function ProjectHeader(): JSX.Element {
  const projects = useHiramekiStore((s) => s.projects);
  const activeProjectId = useHiramekiStore((s) => s.activeProjectId);
  const setActiveProjectId = useHiramekiStore((s) => s.setActiveProjectId);
  const createProject = useHiramekiStore((s) => s.createProject);
  const deleteProject = useHiramekiStore((s) => s.deleteProject);
  // T13: 使い方ガイドの開閉はストアで共有し、ヘッダーのボタン・モバイル下部タブ・
  // 初回自動表示のどこからでもこの同じ状態を介してモーダルを開ける。
  const guideOpen = useHiramekiStore((s) => s.guideOpen);
  const setGuideOpen = useHiramekiStore((s) => s.setGuideOpen);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  function handleCreate(): void {
    const title = newTitle.trim();
    const question = newQuestion.trim();
    if (title.length === 0 || question.length === 0) return;
    createProject(title, question);
    setNewTitle("");
    setNewQuestion("");
    setShowNewModal(false);
  }

  function handleDelete(): void {
    if (!activeProjectId) return;
    deleteProject(activeProjectId);
    setConfirmingDelete(false);
  }

  return (
    <header className="app-header">
      <h1>Hirameki</h1>
      <div className="app-header__controls">
        <select
          value={activeProjectId ?? ""}
          onChange={(e) =>
            setActiveProjectId(e.target.value.length > 0 ? e.target.value : null)
          }
        >
          <option value="">プロジェクトを選択...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setShowNewModal(true)}>
          新規作成
        </button>
        {activeProjectId && (
          <button type="button" onClick={() => setConfirmingDelete(true)}>
            削除
          </button>
        )}
        <button
          type="button"
          className="guide-header-button"
          onClick={() => setGuideOpen(true)}
        >
          使い方
        </button>
        <button
          type="button"
          className="settings-gear-button"
          aria-label="設定"
          title="設定"
          onClick={() => setShowSettings(true)}
        >
          ⚙️
        </button>
      </div>

      {confirmingDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <p>
              このプロジェクトを削除しますか?
              素材カード・組み合わせ・閃きメモ・会話履歴もすべて削除されます。
            </p>
            <div className="modal__actions">
              <button type="button" onClick={handleDelete}>
                削除する
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>新しいプロジェクト</h2>
            <label>
              タイトル
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </label>
            <label>
              解きたい課題
              <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                rows={3}
              />
            </label>
            <div className="modal__actions">
              <button type="button" onClick={handleCreate}>
                作成
              </button>
              <button type="button" onClick={() => setShowNewModal(false)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {guideOpen && <GuideModal onClose={() => setGuideOpen(false)} />}
    </header>
  );
}
