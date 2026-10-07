import { describe, expect, it } from "vitest";
import { checkSpecificity } from "./specificity";

describe("checkSpecificity", () => {
  it("空文字はempty", () => {
    expect(checkSpecificity("   ").level).toBe("empty");
  });

  it("手の動きが見える一動作はok", () => {
    expect(checkSpecificity("参考書を開いて一問だけ解く").level).toBe("ok");
    expect(checkSpecificity("ファイルを開いて、結論を一行書く").level).toBe("ok");
  });

  it("気持ちの言葉はvague", () => {
    const r = checkSpecificity("動画の勉強を頑張る");
    expect(r.level).toBe("vague");
    expect(r.hints.length).toBeGreaterThan(0);
  });

  it("動詞がないとvague", () => {
    expect(checkSpecificity("SNS").level).toBe("vague");
  });

  it("完成度を求めるとヒントが出る", () => {
    const r = checkSpecificity("動画を完成させて投稿する");
    expect(r.hints.some((h) => h.includes("完成度"))).toBe(true);
  });

  it("動作が多すぎるとヒントが出る", () => {
    const r = checkSpecificity("開いて、書いて、撮って、送って、投稿する");
    expect(r.hints.some((h) => h.includes("最初の1つ"))).toBe(true);
  });

  it("ヒントは最大3つ", () => {
    expect(checkSpecificity("色々もっとちゃんと頑張って完成").hints.length).toBeLessThanOrEqual(3);
  });
});
