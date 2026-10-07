import { useState } from "react";
import type { Goal } from "../types";
import { SHRINK_LADDER } from "../lib/presets";
import { SpecificityHint } from "./SpecificityHint";

const MINUTE_CHOICES = [2, 5, 10, 15];

interface Props {
  goal: Goal;
  defaultMinutes: number;
  onStart: (action: string, minutes: number) => void;
  onSaveOnly: (action: string) => void;
  onBack: () => void;
}

export function Define({ goal, defaultMinutes, onStart, onSaveOnly, onBack }: Props) {
  const [action, setAction] = useState(goal.nextAction);
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [showShrink, setShowShrink] = useState(false);
  const trimmed = action.trim();

  return (
    <div className="screen">
      <button type="button" className="link-back" onClick={onBack}>
        ← もどる
      </button>
      <p className="goal-label">{goal.title}</p>
      <h2 className="question">
        これを<strong>{minutes}分だけ</strong>進めるなら、
        <br />
        何に手をつける？
      </h2>

      <textarea
        className="action-input"
        value={action}
        onChange={(e) => setAction(e.target.value)}
        placeholder="例: ファイルを開いて、伝えたい結論を一行書く"
        rows={3}
      />
      <SpecificityHint text={action} />

      <button type="button" className="btn btn--ghost" onClick={() => setShowShrink((v) => !v)}>
        {showShrink ? "とじる" : "重い？ もっと小さくする"}
      </button>
      {showShrink && (
        <div className="shrink">
          <p className="muted">タップで入力欄に入ります。小さくするのは目標ではなく、最初の一歩。</p>
          <div className="chips">
            {[...goal.examples, ...SHRINK_LADDER].map((ex) => (
              <button key={ex} type="button" className="chip" onClick={() => setAction(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="minutes">
        <span className="muted">目安</span>
        {MINUTE_CHOICES.map((m) => (
          <button
            key={m}
            type="button"
            className={`chip ${m === minutes ? "chip--on" : ""}`}
            onClick={() => setMinutes(m)}
          >
            {m}分
          </button>
        ))}
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn btn--primary btn--big"
          disabled={trimmed.length === 0}
          onClick={() => onStart(trimmed, minutes)}
        >
          この一動作をやる
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={trimmed.length === 0}
          onClick={() => onSaveOnly(trimmed)}
        >
          今は無理。メモだけ残す
        </button>
      </div>
    </div>
  );
}
