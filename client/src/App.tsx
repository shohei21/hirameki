import { useEffect, useMemo, useState } from "react";
import { useHiramekiStore } from "./store";
import { useChatController } from "./lib/useChatController";
import { guideSeenRepo } from "./lib/storage";
import ProjectHeader from "./components/ProjectHeader";
import StageStepper from "./components/StageStepper";
import IncubateBanner from "./components/IncubateBanner";
import Chat from "./components/Chat";
import Workbench from "./components/Workbench";
import SparkFab from "./components/SparkFab";

// T10 (レスポンシブ): 900px未満では1カラム表示になり、下部タブバーで
// ステージ/チャット/ワークベンチを切り替える。PC幅(900px以上)ではCSSにより
// このタブ状態は無視され、常に3カラムとも表示される。
type MobileTab = "stage" | "chat" | "workbench";

export default function App(): JSX.Element {
  const projects = useHiramekiStore((s) => s.projects);
  const activeProjectId = useHiramekiStore((s) => s.activeProjectId);
  const setGuideOpen = useHiramekiStore((s) => s.setGuideOpen);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );

  const controller = useChatController(activeProject);

  useEffect(() => {
    // T13: 初回起動時(プロジェクト0件かつ未読フラグなし)は使い方ガイドを自動表示する。
    // マウント時に一度だけ判定すればよいため依存配列は空にする。
    if (projects.length === 0 && !guideSeenRepo.load()) {
      setGuideOpen(true);
      guideSeenRepo.save(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-shell">
      <ProjectHeader />
      {activeProject ? (
        <>
          <div className="main-layout" data-active-tab={mobileTab}>
            <StageStepper project={activeProject} />
            <div className="chat-column">
              <IncubateBanner project={activeProject} />
              <Chat project={activeProject} controller={controller} />
            </div>
            <Workbench project={activeProject} controller={controller} />
          </div>
          <nav className="mobile-tabbar" aria-label="表示切り替え">
            <button
              type="button"
              className={mobileTab === "stage" ? "is-active" : ""}
              onClick={() => setMobileTab("stage")}
            >
              ステージ
            </button>
            <button
              type="button"
              className={mobileTab === "chat" ? "is-active" : ""}
              onClick={() => setMobileTab("chat")}
            >
              チャット
            </button>
            <button
              type="button"
              className={mobileTab === "workbench" ? "is-active" : ""}
              onClick={() => setMobileTab("workbench")}
            >
              ワークベンチ
            </button>
            <button type="button" onClick={() => setGuideOpen(true)}>
              使い方
            </button>
          </nav>
        </>
      ) : (
        <p className="empty-state">
          まだプロジェクトがありません。「新規作成」から、解きたい課題を1つ選んで始めましょう。
          アイデアづくりは、まず素材集めから。
        </p>
      )}
      <SparkFab project={activeProject} />
    </div>
  );
}
