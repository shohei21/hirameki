// T13: チャット入力欄のコンパクト化。
// textareaを1行の高さから内容に応じて自動拡張し、最大5行を超えたら内部スクロールにする。
// scrollHeight実測(DOM依存でjsdomでは信頼できない)ではなく、改行数+概算折り返し幅から
// 決定論的に必要行数を算出する。算出結果を textarea の rows 属性へ直接反映すれば、
// ブラウザネイティブの挙動で「5行を超えたら内部スクロール」も自然に実現できる。

export const MIN_ROWS = 1;
export const MAX_ROWS = 5;

/** 1行あたりの概算文字数(全角/半角混在を考慮したざっくりした目安)。 */
const APPROX_CHARS_PER_ROW = 40;

/**
 * 入力テキストから textarea の rows 属性値を算出する(MIN_ROWS〜MAX_ROWSにクランプ)。
 * 明示的な改行(\n)は1行として数え、各行は APPROX_CHARS_PER_ROW を超えるごとに
 * 折り返し分を追加でカウントする。
 */
export function computeAutoRows(text: string): number {
  if (text.length === 0) return MIN_ROWS;

  const lines = text.split("\n");
  let rows = 0;
  for (const line of lines) {
    rows += Math.max(1, Math.ceil(line.length / APPROX_CHARS_PER_ROW));
  }

  return Math.min(MAX_ROWS, Math.max(MIN_ROWS, rows));
}
