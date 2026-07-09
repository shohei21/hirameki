// DESIGN.md §3 データモデル

export type Stage = "gather" | "digest" | "incubate" | "spark" | "verify";

export interface Project {
  id: string; // crypto.randomUUID()
  title: string; // 例: 「新しい料理系YouTube企画」
  question: string; // 解きたい課題を1文で
  stage: Stage;
  incubateUntil?: string; // ISO。孵化ステージで「◯◯まで寝かせる」を設定した場合
  createdAt: string;
  updatedAt: string;
}

export interface MaterialCard {
  // ステージ1の産出物
  id: string;
  projectId: string;
  kind: "specific" | "general"; // 特殊資料 / 一般資料
  text: string; // 1カード=1事実・1観察 (短文)
  createdAt: string;
}

export interface Combination {
  // ステージ2の産出物
  id: string;
  projectId: string;
  cardIds: string[]; // 組み合わせた素材カード
  note: string; // 見つけた(かもしれない)関連性
  createdAt: string;
}

export interface Spark {
  // ステージ4の産出物
  id: string;
  projectId: string;
  text: string;
  developedText?: string; // ステージ5で発展させた版
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: "user" | "assistant";
  content: string;
  stage: Stage; // 発言時のステージ
  createdAt: string;
}

// T9 (BYOK化): ユーザーが設定画面で入力するAPIキー・モデル選択。
// localStorage `hirameki:v1:settings` にのみ保存され、この端末以外へは送信されない。
export type HiramekiModel = "claude-opus-4-8" | "claude-sonnet-5";

export interface Settings {
  apiKey: string;
  model: HiramekiModel;
}
