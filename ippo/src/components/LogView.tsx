import { useRef, useState } from "react";
import type { AppData, StepLog } from "../types";
import { computeStats, dayKey, recentDays } from "../lib/stats";
import { parseData } from "../lib/storage";

interface Props {
  data: AppData;
  now: number;
  onImport: (data: AppData) => void;
}

function timeOf(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildEvidenceText(data: AppData, now: number): string {
  const s = computeStats(data.logs, now);
  const byGoal = new Map<string, number>();
  for (const l of data.logs) byGoal.set(l.goalTitle, (byGoal.get(l.goalTitle) ?? 0) + 1);
  const lines = [
    `「今日できる一動作」を決めて動いた記録`,
    `合計 ${s.totalSteps}歩 / ${s.totalMinutes}分 / 動いた日 ${s.activeDays}日 / 連続 ${s.streakDays}日`,
    ...[...byGoal.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `・${t}: ${n}歩`),
  ];
  return lines.join("\n");
}

export function LogView({ data, now, onImport }: Props) {
  const stats = computeStats(data.logs, now);
  const days = recentDays(data.logs, now, 28);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  const sorted = [...data.logs].sort((a, b) => b.startedAt - a.startedAt).slice(0, 60);
  const groups = new Map<string, StepLog[]>();
  for (const l of sorted) {
    const k = dayKey(l.startedAt);
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }

  const copyEvidence = async () => {
    try {
      await navigator.clipboard.writeText(buildEvidenceText(data, now));
      setMsg("コピーしました");
    } catch {
      setMsg("コピーできませんでした");
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ippo-backup-${dayKey(now)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File) => {
    try {
      const parsed = parseData(JSON.parse(await file.text()));
      if (!parsed) {
        setMsg("このファイルは読み込めませんでした");
        return;
      }
      if (window.confirm("今のデータをバックアップの内容で置き換えます。よろしいですか？")) {
        onImport(parsed);
        setMsg("復元しました");
      }
    } catch {
      setMsg("このファイルは読み込めませんでした");
    }
  };

  return (
    <div className="screen">
      <h2 className="section-title">記録 = 動けた証拠</h2>
      <div className="tiles">
        <div className="tile"><span className="tile__num">{stats.todaySteps}</span><span className="tile__label">今日</span></div>
        <div className="tile"><span className="tile__num">{stats.streakDays}</span><span className="tile__label">連続日数</span></div>
        <div className="tile"><span className="tile__num">{stats.totalSteps}</span><span className="tile__label">合計の一歩</span></div>
        <div className="tile"><span className="tile__num">{stats.totalMinutes}</span><span className="tile__label">合計(分)</span></div>
      </div>

      <div className="heat" aria-label="直近28日">
        {days.map((d) => (
          <span
            key={d.key}
            className={`heat__cell heat__cell--${Math.min(d.count, 3)}`}
            title={`${d.key}: ${d.count}歩`}
          />
        ))}
      </div>
      <p className="muted small">直近28日。1マス=1日。0の日があっても、また今日から。</p>

      <button type="button" className="btn btn--secondary" onClick={copyEvidence} disabled={data.logs.length === 0}>
        記録の要約をコピー(共有用)
      </button>
      {msg && <p className="muted small">{msg}</p>}

      {[...groups.entries()].map(([day, logs]) => (
        <section key={day} className="log-day">
          <h3>{day}</h3>
          <ul>
            {logs.map((l) => (
              <li key={l.id} className="log-item">
                <span className="log-item__meta">
                  {timeOf(l.startedAt)}・{l.goalTitle}・{l.durationSec < 60 ? `${l.durationSec}秒` : `${Math.round(l.durationSec / 60)}分`}
                </span>
                <span className="log-item__action">{l.action}</span>
                {l.note && <span className="log-item__note">見えたこと: {l.note}</span>}
                {l.nextActionMemo && <span className="log-item__note">次: {l.nextActionMemo}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {data.logs.length === 0 && <p className="muted">まだ記録はありません。最初の一歩は、ファイルを開くだけでもいい。</p>}

      <section className="backup">
        <h3>バックアップ</h3>
        <p className="muted small">データはこの端末のブラウザにだけ保存されています。機種変更や別の端末へはファイルで移せます。</p>
        <div className="row">
          <button type="button" className="btn btn--ghost" onClick={exportJson}>書き出す</button>
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>読み込む</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importJson(f);
              e.target.value = "";
            }}
          />
        </div>
      </section>
    </div>
  );
}
