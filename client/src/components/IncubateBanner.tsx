import { useState } from "react";
import type { Project } from "../types";
import { useHiramekiStore } from "../store";

interface IncubateBannerProps {
  project: Project;
}

export default function IncubateBanner({ project }: IncubateBannerProps): JSX.Element | null {
  const setIncubateUntil = useHiramekiStore((s) => s.setIncubateUntil);
  const [draftUntil, setDraftUntil] = useState("");

  if (project.stage !== "incubate") return null;

  const until = project.incubateUntil ? new Date(project.incubateUntil) : null;
  const isPastDue = until !== null && until.getTime() <= Date.now();

  function handleSetUntil(): void {
    if (draftUntil.length === 0) return;
    const iso = new Date(draftUntil).toISOString();
    setIncubateUntil(project.id, iso);
    setDraftUntil("");
  }

  if (isPastDue) {
    return (
      <div className="incubate-banner incubate-banner--due">
        <p>寝かせる期限が来ました。何か閃いた?</p>
        <button type="button" onClick={() => setIncubateUntil(project.id, undefined)}>
          期限をクリア
        </button>
      </div>
    );
  }

  return (
    <div className="incubate-banner">
      <p>いま寝かせ中。課題のことは忘れよう。</p>
      {until ? (
        <p className="incubate-banner__until">
          {until.toLocaleString("ja-JP")} まで寝かせる予定
        </p>
      ) : (
        <div className="incubate-banner__set">
          <input
            type="datetime-local"
            value={draftUntil}
            onChange={(e) => setDraftUntil(e.target.value)}
          />
          <button type="button" onClick={handleSetUntil}>
            期限を設定
          </button>
        </div>
      )}
    </div>
  );
}
