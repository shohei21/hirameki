import { useEffect, useRef, useState } from "react";
import type { ActiveSession } from "../lib/session";

interface Props {
  session: ActiveSession;
  goalTitle: string;
  onFinish: (outcome: "done" | "stopped", durationSec: number) => void;
  onCancel: () => void;
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function chime(): void {
  try {
    navigator.vibrate?.([200, 100, 200]);
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    // 音が出せない環境でも続行
  }
}

export function Timer({ session, goalTitle, onFinish, onCancel }: Props) {
  const [now, setNow] = useState(Date.now());
  const chimed = useRef(false);
  const total = session.minutes * 60;
  const elapsed = (now - session.startedAt) / 1000;
  const remaining = total - elapsed;
  const over = remaining <= 0;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  // 画面が消えるとタイマーを見失いやすいので、対応ブラウザでは画面を点けたままにする
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock
      ?.request("screen")
      .then((l) => {
        lock = l;
      })
      .catch(() => undefined);
    return () => {
      void lock?.release();
    };
  }, []);

  useEffect(() => {
    if (over && !chimed.current) {
      chimed.current = true;
      // 開いたときに既に大幅に過ぎていたら鳴らさない(復元時)
      if (elapsed - total < 5) chime();
    }
  }, [over, elapsed, total]);

  const progress = Math.min(1, elapsed / total);
  const R = 88;
  const C = 2 * Math.PI * R;

  return (
    <div className="screen screen--timer">
      <p className="goal-label">{goalTitle}</p>
      <p className="timer-action">{session.action}</p>

      <div className="ring">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r={R} className="ring__bg" />
          <circle
            cx="100"
            cy="100"
            r={R}
            className={`ring__fg ${over ? "ring__fg--over" : ""}`}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
          />
        </svg>
        <div className="ring__text">
          {over ? (
            <>
              <span className="ring__time">+{fmt(-remaining)}</span>
              <span className="ring__sub">続けられそうなら、そのまま</span>
            </>
          ) : (
            <>
              <span className="ring__time">{fmt(remaining)}</span>
              <span className="ring__sub">うまくやらなくていい</span>
            </>
          )}
        </div>
      </div>

      {over && <p className="over-msg">{session.minutes}分たった。一歩、踏めた。</p>}

      <div className="actions">
        <button type="button" className="btn btn--primary btn--big" onClick={() => onFinish("done", elapsed)}>
          できた！
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => onFinish("stopped", elapsed)}>
          ここで止める(次の一動作をメモ)
        </button>
        <button type="button" className="btn btn--ghost btn--small" onClick={onCancel}>
          まだ手をつけてない(やり直す)
        </button>
      </div>
    </div>
  );
}
