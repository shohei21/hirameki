import { useMemo, useState } from "react";
import { useHiramekiStore } from "./store";
import { useChatController } from "./lib/useChatController";
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
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );

  const controller = useChatController(activeProject);

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
