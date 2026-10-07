import { useState } from "react";
import type { Goal } from "../types";

interface Props {
  goals: Goal[];
  defaultMinutes: number;
  onAdd: (title: string) => void;
  onUpdate: (id: string, patch: Partial<Goal>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDefaultMinutes: (m: number) => void;
}

export function GoalsView({ goals, defaultMinutes, onAdd, onUpdate, onRemove, onMove, onDefaultMinutes }: Props) {
  const [title, setTitle] = useState("");
  const active = goals.filter((g) => !g.archived);
  const archived = goals.filter((g) => g.archived);

  return (
    <div className="screen">
      <h2 className="section-title">やりたいこと(大きいままでいい)</h2>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) {
            onAdd(title.trim());
            setTitle("");
          }
        }}
      >
        <input
          className="text-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="後回しにしていることを1つ"
        />
        <button type="submit" className="btn btn--primary" disabled={!title.trim()}>
          追加
        </button>
      </form>

      <ul className="edit-list">
        {active.map((g, i) => (
          <li key={g.id} className="edit-item">
            <input
              className="text-input text-input--title"
              value={g.title}
              onChange={(e) => onUpdate(g.id, { title: e.target.value })}
              aria-label="目標"
            />
            <textarea
              value={g.nextAction}
              onChange={(e) => onUpdate(g.id, { nextAction: e.target.value })}
              rows={2}
              placeholder="次の一動作(未設定でもOK)"
              aria-label="次の一動作"
            />
            <div className="row row--end">
              <button type="button" className="btn btn--ghost btn--small" disabled={i === 0} onClick={() => onMove(g.id, -1)}>↑</button>
              <button type="button" className="btn btn--ghost btn--small" disabled={i === active.length - 1} onClick={() => onMove(g.id, 1)}>↓</button>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => onUpdate(g.id, { archived: true })}>
                しまう
              </button>
            </div>
          </li>
        ))}
      </ul>

      {archived.length > 0 && (
        <section>
          <h3 className="muted">しまった目標</h3>
          <ul className="edit-list">
            {archived.map((g) => (
              <li key={g.id} className="row edit-item--archived">
                <span className="grow">{g.title}</span>
                <button type="button" className="btn btn--ghost btn--small" onClick={() => onUpdate(g.id, { archived: false })}>戻す</button>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => {
                    if (window.confirm(`「${g.title}」を削除しますか？(記録は残ります)`)) onRemove(g.id);
                  }}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="settings">
        <h3>タイマーの目安(初期値)</h3>
        <div className="row">
          {[2, 5, 10, 15].map((m) => (
            <button
              key={m}
              type="button"
              className={`chip ${m === defaultMinutes ? "chip--on" : ""}`}
              onClick={() => onDefaultMinutes(m)}
            >
              {m}分
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
