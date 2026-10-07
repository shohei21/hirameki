import type { Goal } from "../types";

interface GoalPreset {
  title: string;
  nextAction: string;
  examples: string[];
}

/** 初回起動時に入れておく目標。作者自身の「動けていないこと」から作った例。編集・削除は自由。 */
export const INITIAL_GOALS: GoalPreset[] = [
  {
    title: "AI動画スキル向上",
    nextAction: "動画生成ツールを開いて、プロンプト欄に1行だけ書いて生成ボタンを押す",
    examples: [
      "動画生成ツールのタブを開くだけ",
      "気になった作品を1本だけ見て、真似したい点を1行メモする",
      "昨日のプロンプトをコピーして、1単語だけ変えて生成する",
    ],
  },
  {
    title: "AI動画コンテスト参加→提出",
    nextAction: "コンテストの応募ページを開いて、締切日をカレンダーに1件入れる",
    examples: [
      "応募要項を開いて、尺の上限だけメモする",
      "作品タイトル案を1つだけメモに書く",
      "使えそうな過去の生成動画を1本だけフォルダに移す",
    ],
  },
  {
    title: "SNS: AI動画アカウント",
    nextAction: "投稿画面を開いて、キャプションを1文だけ書いて下書き保存する",
    examples: [
      "アプリを開いて、自分のプロフィール画面を見るだけ",
      "投稿したい動画を1本だけ選んでお気に入りに入れる",
      "ハッシュタグを3つだけメモに書く",
    ],
  },
  {
    title: "SNS: 裏垢",
    nextAction: "アプリでアカウントを切り替えて、つぶやきを1文だけ書いて下書き保存する",
    examples: [
      "アカウントを切り替えるだけ",
      "今日感じたことを1文だけメモする",
    ],
  },
  {
    title: "SNS: 裏垢促進",
    nextAction: "タイムラインを開いて、1件だけ返信を書いて送信する",
    examples: [
      "似たジャンルのアカウントを1つだけフォローする",
      "伸びている投稿を1つだけ保存する",
    ],
  },
  {
    title: "リサーチ活動",
    nextAction: "メモアプリを開いて、調べたいことを1行だけ書く",
    examples: [
      "検索窓にキーワードを1つ入れて、上から1件だけ開く",
      "気になった記事のURLを1つだけメモに貼る",
    ],
  },
];

/** どの目標にも使える「さらに小さくする」ためのはしご。 */
export const SHRINK_LADDER: string[] = [
  "アプリ(またはファイル)を開くだけ",
  "タイトルだけ書く",
  "1行だけ書く(あとで直す前提で)",
  "1つだけ見る・1件だけ探す",
  "次にやることを1行メモするだけ",
];

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildInitialGoals(now: number): Goal[] {
  return INITIAL_GOALS.map((p, i) => ({
    id: newId() + i,
    title: p.title,
    nextAction: p.nextAction,
    examples: p.examples,
    createdAt: now + i,
    archived: false,
  }));
}
