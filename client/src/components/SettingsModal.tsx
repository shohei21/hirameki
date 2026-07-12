// T9 (BYOK化): 設定画面。APIキー(パスワード入力・localStorageにのみ保存)とモデル選択。
// T12: データのエクスポート/インポートもここに追加(settings=APIキーは対象外)。
import { useRef, useState, type ChangeEvent } from "react";
import { useHiramekiStore } from "../store";
import type { HiramekiModel } from "../types";
import { buildBackup, downloadBackup, validateBackup, applyBackup } from "../lib/backup";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps): JSX.Element {
  const settings = useHiramekiStore((s) => s.settings);
  const updateSettings = useHiramekiStore((s) => s.updateSettings);

  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState<HiramekiModel>(settings.model);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleSave(): void {
    updateSettings({ apiKey: apiKey.trim(), model });
    onClose();
  }

  function handleExport(): void {
    downloadBackup(buildBackup());
  }

  function handleImportClick(): void {
    setImportError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0] ?? null;
    // 同じファイルを連続で選び直せるようにリセットしておく
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch {
        setImportError("JSONの解析に失敗しました。ファイルが壊れている可能性があります。");
        return;
      }
      const result = validateBackup(parsed);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      const confirmed = window.confirm(
        "現在のデータを上書きします。この操作は取り消せません。よろしいですか?",
      );
      if (!confirmed) return;
      applyBackup(result.data);
      window.location.reload();
    };
    reader.onerror = () => {
      setImportError("ファイルの読み込みに失敗しました。");
    };
    reader.readAsText(file);
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>設定</h2>
        <label>
          Anthropic APIキー
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            autoComplete="off"
          />
        </label>
        <p className="settings-note">
          キーはこの端末にのみ保存され、Anthropic以外には送信されません。
        </p>
        <label>
          モデル
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as HiramekiModel)}
          >
            <option value="claude-opus-4-8">claude-opus-4-8(デフォルト)</option>
            <option value="claude-sonnet-5">claude-sonnet-5</option>
          </select>
        </label>

        <div className="settings-backup">
          <h3>データのバックアップ</h3>
          <p className="settings-note">
            プロジェクト・素材カード・組み合わせ・閃きメモ・会話履歴をJSONファイルに書き出せます(APIキーは含まれません)。
          </p>
          <div className="settings-backup__actions">
            <button type="button" onClick={handleExport}>
              エクスポート
            </button>
            <button type="button" onClick={handleImportClick}>
              インポート
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              style={{ display: "none" }}
              aria-label="バックアップファイルを選択"
            />
          </div>
          {importError && <p className="settings-backup__error">{importError}</p>}
        </div>

        <div className="modal__actions">
          <button type="button" onClick={handleSave}>
            保存
          </button>
          <button type="button" onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
