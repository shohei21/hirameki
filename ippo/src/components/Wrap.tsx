import { useState } from "react";
import { SpecificityHint } from "./SpecificityHint";

interface Props {
  goalTitle: string;
  action: string;
  durationSec: number;
  outcome: "done" | "stopped";
  todaySteps: number;
  onSave: (nextAction: string, note: string, again: boolean) => void;
}

export function Wrap({ goalTitle, action, durationSec, outcome, todaySteps, onSave }: Props) {
  const [next, setNext] = useState("");
  const [note, setNote] = useState("");
  const min = Math.floor(durationSec / 60);
  const sec = Math.floor(durationSec % 60);

  return (
    <div className="screen">
      <div className="celebrate">
        <p className="celebrate__big">一歩、踏んだ。</p>
        <p className="muted">
          {goalTitle}・{min > 0 ? `${min}分` : ""}
          {sec}秒・今日{todaySteps + 1}歩目
        </p>
        <p className="celebrate__action">「{action}」</p>
      </div>

      <label className="field">
        <span className="field__label">やってみて見えたことは？(任意)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="例: 冒頭3秒の掴みが弱いと分かった"
        />
      </label>

      <label className="field">
        <span className="field__label">
          {outcome === "stopped" ? "止める前に、" : ""}次にやる一動作は？
        </span>
        <textarea
          value={next}
          onChange={(e) => setNext(e.target.value)}
          rows={2}
          placeholder="「続きから頑張る」ではなく、例:「この結論を支える数字を一つ探す」"
        />
      </label>
      <SpecificityHint text={next} />
      <p className="muted small">これを書いておけば、再開するときに迷わない。</p>

      <div className="actions">
        <button type="button" className="btn btn--primary btn--big" onClick={() => onSave(next.trim(), note.trim(), false)}>
          記録してホームへ
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={next.trim().length === 0}
          onClick={() => onSave(next.trim(), note.trim(), true)}
        >
          このまま次の一動作もやる
        </button>
      </div>
    </div>
  );
}
