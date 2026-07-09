// T9 (BYOK化): 設定画面。APIキー(パスワード入力・localStorageにのみ保存)とモデル選択。
import { useState } from "react";
import { useHiramekiStore } from "../store";
import type { HiramekiModel } from "../types";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps): JSX.Element {
  const settings = useHiramekiStore((s) => s.settings);
  const updateSettings = useHiramekiStore((s) => s.updateSettings);

  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState<HiramekiModel>(settings.model);

  function handleSave(): void {
    updateSettings({ apiKey: apiKey.trim(), model });
    onClose();
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
