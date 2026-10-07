import { describe, expect, it } from "vitest";
import { createInitialData, parseData } from "./storage";

describe("parseData", () => {
  it("初期データは往復しても同じ", () => {
    const d = createInitialData(1000);
    expect(parseData(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });

  it("形式が違えばnull", () => {
    expect(parseData(null)).toBeNull();
    expect(parseData({ schemaVersion: 2, goals: [], logs: [] })).toBeNull();
    expect(parseData({ schemaVersion: 1, goals: "x", logs: [] })).toBeNull();
  });

  it("壊れた要素は捨て、欠けた項目は補う", () => {
    const d = parseData({
      schemaVersion: 1,
      goals: [{ id: "a", title: "A" }, { title: "no id" }],
      logs: [{ id: "l", durationSec: "x" }],
      defaultMinutes: 999,
    });
    expect(d?.goals).toHaveLength(1);
    expect(d?.goals[0]?.nextAction).toBe("");
    expect(d?.logs[0]?.durationSec).toBe(0);
    expect(d?.defaultMinutes).toBe(2);
  });
});
