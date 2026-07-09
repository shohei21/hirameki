import type { Project, Stage } from "../types";
import { useHiramekiStore } from "../store";

interface StageMeta {
  id: Stage;
  order: number;
  label: string;
  description: string;
}

const STAGES: StageMeta[] = [
  {
    id: "gather",
    order: 1,
    label: "収集",
    description: "インタビュアー。特殊資料と一般資料を質問で引き出す。",
  },
  {
    id: "digest",
    order: 2,
    label: "咀嚼",
    description: "パズルの相棒。素材カード同士の組み合わせを試す。",
  },
  {
    id: "incubate",
    order: 3,
    label: "孵化",
    description: "番人。課題をいったん手放し、無意識に委ねる。",
  },
  {
    id: "spark",
    order: 4,
    label: "誕生",
    description: "書記。閃きを逃さず記録し、言語化を手伝う。",
  },
  {
    id: "verify",
    order: 5,
    label: "検証",
    description: "建設的な批評家。誰に・何が新しいか・実現条件を問う。",
  },
];

interface StageStepperProps {
  project: Project;
}

export default function StageStepper({ project }: StageStepperProps): JSX.Element {
  const updateProjectStage = useHiramekiStore((s) => s.updateProjectStage);
  const current = STAGES.find((s) => s.id === project.stage);

  return (
    <nav className="stage-stepper">
      <ol>
        {STAGES.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className={`stage-step${s.id === project.stage ? " stage-step--active" : ""}`}
              onClick={() => updateProjectStage(project.id, s.id)}
            >
              <span className="stage-step__order">{s.order}</span>
              <span className="stage-step__label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
      {current && <p className="stage-step__description">{current.description}</p>}
    </nav>
  );
}
