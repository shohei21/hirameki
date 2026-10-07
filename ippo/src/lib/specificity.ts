// 「何をするか迷わず分かる」まで具体的かを判定するヒューリスティック。
// 行動を止めないよう、判定は助言に留めて開始ボタンは塞がない。

export type SpecificityLevel = "empty" | "vague" | "ok";

export interface SpecificityResult {
  level: SpecificityLevel;
  hints: string[];
}

/** 動作がぼやける言葉。目標や意気込みの言葉で、手の動きが分からない。 */
const VAGUE_WORDS: { word: string; hint: string }[] = [
  { word: "頑張", hint: "「頑張る」は気持ちの言葉。手の動きに置き換えよう" },
  { word: "がんば", hint: "「がんばる」は気持ちの言葉。手の動きに置き換えよう" },
  { word: "いい感じ", hint: "「いい感じに」では最初の動きが分からない" },
  { word: "ちゃんと", hint: "「ちゃんと」は外して、何を1つやるかだけ書こう" },
  { word: "しっかり", hint: "「しっかり」は外して、何を1つやるかだけ書こう" },
  { word: "少し", hint: "「少し」はまだ曖昧。何を1つ、まで決めよう" },
  { word: "ちょっと", hint: "「ちょっと」はまだ曖昧。何を1つ、まで決めよう" },
  { word: "もっと", hint: "「もっと」は目標の言葉。今日の一動作に絞ろう" },
  { word: "色々", hint: "「色々」ではなく、1つだけ選ぼう" },
  { word: "いろいろ", hint: "「いろいろ」ではなく、1つだけ選ぼう" },
  { word: "全部", hint: "全部ではなく、最初の1つだけにしよう" },
  { word: "進める", hint: "「進める」は何をするかが曖昧。最初に触るものを書こう" },
  { word: "取り組む", hint: "「取り組む」は何をするかが曖昧。最初に触るものを書こう" },
  { word: "勉強する", hint: "「勉強する」なら、何を開いて何を1つやる？" },
  { word: "努力", hint: "「努力」は気持ちの言葉。手の動きに置き換えよう" },
  { word: "検討", hint: "「検討」なら、何を開いて何を1行書く？" },
  { word: "準備", hint: "「準備」の最初の1つは何？" },
  { word: "整理", hint: "「整理」なら、最初に1つ捨てる・移すものは？" },
  { word: "なんとか", hint: "「なんとか」ではなく、最初の一手を書こう" },
];

/** 完成度を求める言葉。最初の一歩に完成度を求めると重くなる。 */
const PERFECTION_WORDS = ["完成", "仕上げ", "完璧", "終わらせる", "きれいに", "ちゃんとした"];

/** 手の動きが見える動詞(の一部)。どれかが含まれていれば具体的とみなしやすい。 */
const CONCRETE_VERBS = [
  "開", "書", "打", "押", "送", "撮", "読", "見", "探", "検索", "メモ", "貼", "保存",
  "生成", "投稿", "捨て", "解", "電話", "入力", "コピー", "選", "入れ", "移", "フォロー",
  "返信", "切り替え", "聞", "録", "描", "切", "置", "消", "閉", "登録", "申し込", "ダウンロード",
  "インストール", "クリック", "タップ", "再生", "調べ", "並べ", "決め",
];

export function checkSpecificity(input: string): SpecificityResult {
  const text = input.trim();
  if (text.length === 0) {
    return { level: "empty", hints: [] };
  }

  const hints: string[] = [];
  for (const { word, hint } of VAGUE_WORDS) {
    if (text.includes(word)) hints.push(hint);
  }
  if (PERFECTION_WORDS.some((w) => text.includes(w))) {
    hints.push("最初の一歩に完成度はいらない。「あとで直すための一つ」で十分");
  }
  if (!CONCRETE_VERBS.some((v) => text.includes(v))) {
    hints.push("手の動きが分かる動詞(開く・書く・押す・送る…)を入れてみよう");
  }
  const steps = text.split(/[、,→]|して|してから/).filter((s) => s.trim().length > 0);
  if (steps.length >= 4 || text.length > 70) {
    hints.push("動作が多いかも。最初の1つだけに絞ろう");
  }

  return { level: hints.length === 0 ? "ok" : "vague", hints: hints.slice(0, 3) };
}
