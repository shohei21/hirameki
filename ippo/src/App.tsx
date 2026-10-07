import { useEffect, useState } from "react";
import type { AppData, Goal, StepLog } from "./types";
import { loadData, saveData } from "./lib/storage";
import { loadActive, saveActive, type ActiveSession } from "./lib/session";
import { computeStats } from "./lib/stats";
import { newId } from "./lib/presets";
import { Home } from "./components/Home";
import { Define } from "./components/Define";
import { Timer } from "./components/Timer";
import { Wrap } from "./components/Wrap";
import { LogView } from "./components/LogView";
import { GoalsView } from "./components/GoalsView";

type Tab = "home" | "log" | "goals";

type Flow =
  | { kind: "none" }
  | { kind: "define"; goalId: string }
  | { kind: "timer"; session: ActiveSession }
  | { kind: "wrap"; session: ActiveSession; outcome: "done" | "stopped"; durationSec: number };

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData(Date.now()));
  const [tab, setTab] = useState<Tab>("home");
  const [flow, setFlow] = useState<Flow>(() => {
    const active = loadActive();
    return active ? { kind: "timer", session: active } : { kind: "none" };
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => saveData(data), [data]);
  useEffect(() => saveActive(flow.kind === "timer" ? flow.session : null), [flow]);
  // 日付をまたいだときに「今日」の数字を更新する
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const goals = data.goals.filter((g) => !g.archived);
  const stats = computeStats(data.logs, now);
  const goalOf = (id: string): Goal | undefined => data.goals.find((g) => g.id === id);

  const updateGoal = (id: string, patch: Partial<Goal>) =>
    setData((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));

  const moveGoal = (id: string, dir: -1 | 1) =>
    setData((d) => {
      const active = d.goals.filter((g) => !g.archived);
      const i = active.findIndex((g) => g.id === id);
      const j = i + dir;
      const a = active[i];
      const b = active[j];
      if (!a || !b) return d;
      active[i] = b;
      active[j] = a;
      return { ...d, goals: [...active, ...d.goals.filter((g) => g.archived)] };
    });

  const finishWrap = (session: ActiveSession, outcome: "done" | "stopped", durationSec: number, nextAction: string, note: string, again: boolean) => {
    const goal = goalOf(session.goalId);
    const log: StepLog = {
      id: newId(),
      goalId: session.goalId,
      goalTitle: goal?.title ?? "",
      action: session.action,
      startedAt: session.startedAt,
      durationSec: Math.round(durationSec),
      outcome,
      nextActionMemo: nextAction,
      note,
    };
    setData((d) => ({
      ...d,
      logs: [...d.logs, log],
      goals: d.goals.map((g) => (g.id === session.goalId ? { ...g, nextAction } : g)),
    }));
    setNow(Date.now());
    setFlow(again ? { kind: "define", goalId: session.goalId } : { kind: "none" });
    setTab("home");
  };

  let body: JSX.Element;
  if (flow.kind === "define") {
    const goal = goalOf(flow.goalId);
    body = goal ? (
      <Define
        key={goal.id + goal.nextAction}
        goal={goal}
        defaultMinutes={data.defaultMinutes}
        onBack={() => setFlow({ kind: "none" })}
        onSaveOnly={(action) => {
          updateGoal(goal.id, { nextAction: action });
          setFlow({ kind: "none" });
        }}
        onStart={(action, minutes) => {
          updateGoal(goal.id, { nextAction: action });
          setFlow({ kind: "timer", session: { goalId: goal.id, action, minutes, startedAt: Date.now() } });
        }}
      />
    ) : (
      <p>目標が見つかりません</p>
    );
  } else if (flow.kind === "timer") {
    const s = flow.session;
    body = (
      <Timer
        session={s}
        goalTitle={goalOf(s.goalId)?.title ?? ""}
        onFinish={(outcome, durationSec) => setFlow({ kind: "wrap", session: s, outcome, durationSec })}
        onCancel={() => setFlow({ kind: "define", goalId: s.goalId })}
      />
    );
  } else if (flow.kind === "wrap") {
    const { session, outcome, durationSec } = flow;
    body = (
      <Wrap
        goalTitle={goalOf(session.goalId)?.title ?? ""}
        action={session.action}
        durationSec={durationSec}
        outcome={outcome}
        todaySteps={stats.todaySteps}
        onSave={(next, note, again) => finishWrap(session, outcome, durationSec, next, note, again)}
      />
    );
  } else if (tab === "log") {
    body = <LogView data={data} now={now} onImport={(d) => setData(d)} />;
  } else if (tab === "goals") {
    body = (
      <GoalsView
        goals={data.goals}
        defaultMinutes={data.defaultMinutes}
        onAdd={(title) =>
          setData((d) => ({
            ...d,
            goals: [...d.goals, { id: newId(), title, nextAction: "", examples: [], createdAt: Date.now(), archived: false }],
          }))
        }
        onUpdate={updateGoal}
        onRemove={(id) => setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }))}
        onMove={moveGoal}
        onDefaultMinutes={(m) => setData((d) => ({ ...d, defaultMinutes: m }))}
      />
    );
  } else {
    body = (
      <Home
        goals={goals}
        stats={stats}
        now={now}
        onPick={(goalId) => setFlow({ kind: "define", goalId })}
        onAddGoal={() => setTab("goals")}
      />
    );
  }

  const inFlow = flow.kind !== "none";
  return (
    <div className="app">
      <header className="app-header">
        <h1>
          Ippo <span className="app-header__sub">今日の一動作</span>
        </h1>
      </header>
      <main className="app-main">{body}</main>
      {!inFlow && (
        <nav className="tabbar">
          {(
            [
              ["home", "一歩"],
              ["log", "記録"],
              ["goals", "目標"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              className={`tabbar__btn ${tab === t ? "tabbar__btn--on" : ""}`}
              onClick={() => setTab(t)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
