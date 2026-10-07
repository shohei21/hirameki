import type { Goal } from "../types";
import type { Stats } from "../lib/stats";

const WORDS = [
  "大きな目標を持ったまま、入口は小さくていい。",
  "明日こそ頑張ると決める前に、今日できる一動作を決めよう。",
  "最初の一歩の役割は、次に何が必要かを見えるようにすること。",
  "「なぜ動けない？」より「どこまで小さくすれば手をつけられる？」",
  "最初から「うまくやる」まで求めなくていい。",
];

interface Props {
  goals: Goal[];
  stats: Stats;
  now: number;
  onPick: (goalId: string) => void;
  onAddGoal: () => void;
}

export function Home({ goals, stats, now, onPick, onAddGoal }: Props) {
  const word = WORDS[Math.floor(now / (1000 * 60 * 60 * 6)) % WORDS.length] ?? WORDS[0];
  return (
    <div className="screen">
      <section className="today">
        <div className="today__count">
          <span className="today__num">{stats.todaySteps}</span>
          <span className="today__label">今日の一歩</span>
        </div>
        <div className="today__count">
          <span className="today__num">{stats.streakDays}</span>
          <span className="today__label">連続日数</span>
        </div>
        <p className="today__word">{word}</p>
      </section>

      <h2 className="section-title">どれを2分だけ進める？</h2>
      <ul className="goal-list">
        {goals.map((g) => (
          <li key={g.id}>
            <button type="button" className="goal-card" onClick={() => onPick(g.id)}>
              <span className="goal-card__title">{g.title}</span>
              <span className="goal-card__next">
                {g.nextAction ? (
                  <>
                    <span className="goal-card__tag">次の一動作</span>
                    {g.nextAction}
                  </>
                ) : (
                  <span className="muted">一動作がまだ決まっていない → タップして決める</span>
                )}
              </span>
              <span className="goal-card__go">▶ 2分だけ</span>
            </button>
          </li>
        ))}
      </ul>
      {goals.length === 0 && (
        <button type="button" className="btn btn--primary" onClick={onAddGoal}>
          後回しにしていることを1つ書く
        </button>
      )}
    </div>
  );
}
