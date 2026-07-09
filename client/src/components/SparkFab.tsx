import { useState } from "react";
import type { Project } from "../types";
import { useHiramekiStore } from "../store";

interface SparkFabProps {
  project: Project | null;
}

/** 右下フローティング「+閃きを記録」ボタン。全ステージ共通で表示する。 */
export default function SparkFab({ project }: SparkFabProps): JSX.Element | null {
  const addSpark = useHiramekiStore((s) => s.addSpark);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  if (!project) return null;

  function handleSave(): void {
    if (!project) return;
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    addSpark(project.id, trimmed);
    setText("");
    setOpen(false);
  }

  return (
    <div className="spark-fab">
      {open && (
        <div className="spark-fab__panel">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="いま閃いたことを書く"
            rows={3}
            autoFocus
          />
          <div className="spark-fab__actions">
            <button type="button" onClick={handleSave}>
              保存
            </button>
            <button type="button" onClick={() => setOpen(false)}>
              キャンセル
            </button>
          </div>
        </div>
      )}
      <button type="button" className="spark-fab__button" onClick={() => setOpen((v) => !v)}>
        + 閃きを記録
      </button>
    </div>
  );
}
