import { describe, expect, it } from "vitest";
import { computeAutoRows, MIN_ROWS, MAX_ROWS } from "./autosize";

// T13: チャット入力欄の自動拡張ロジック(1行の高さから内容に応じて最大5行まで拡張)。

describe("computeAutoRows", () => {
  it("空文字は最小行数(1行)", () => {
    expect(computeAutoRows("")).toBe(MIN_ROWS);
  });

  it("短い1行の入力は1行のまま", () => {
    expect(computeAutoRows("こんにちは")).toBe(1);
  });

  it("改行の数だけ行数が増える", () => {
    expect(computeAutoRows("1行目\n2行目\n3行目")).toBe(3);
  });

  it("長い1行は概算の折り返し行数として数える", () => {
    const longLine = "あ".repeat(85); // 40文字/行の概算で3行相当
    expect(computeAutoRows(longLine)).toBe(3);
  });

  it("最大5行を超える内容でもMAX_ROWSでクランプされる(内部スクロール前提)", () => {
    const manyLines = Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n");
    expect(computeAutoRows(manyLines)).toBe(MAX_ROWS);
  });

  it("行数は常にMIN_ROWS以上MAX_ROWS以下にクランプされる", () => {
    expect(computeAutoRows("a")).toBeGreaterThanOrEqual(MIN_ROWS);
    expect(computeAutoRows("a".repeat(1000))).toBeLessThanOrEqual(MAX_ROWS);
  });
});
