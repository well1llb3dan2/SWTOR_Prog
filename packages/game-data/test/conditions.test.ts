import { describe, expect, it } from "vitest";
import { evaluateCondition, type Condition, type ConditionContext } from "@swtor/game-data";

function ctx(counters: Record<string, number>, currentPhaseOrder = 1): ConditionContext {
  return {
    getCounter: (id: string) => counters[id] ?? 0,
    currentPhaseOrder,
  };
}

describe("evaluateCondition", () => {
  it("compares a counter against a threshold", () => {
    const condition: Condition = { kind: "counterCompare", counterId: "adds", operator: "gte", value: 3 };
    expect(evaluateCondition(condition, ctx({ adds: 3 }))).toBe(true);
    expect(evaluateCondition(condition, ctx({ adds: 2 }))).toBe(false);
  });

  it("checks whether the current phase is one of a set", () => {
    const condition: Condition = { kind: "phaseActive", phaseOrders: [2, 3] };
    expect(evaluateCondition(condition, ctx({}, 2))).toBe(true);
    expect(evaluateCondition(condition, ctx({}, 1))).toBe(false);
  });

  it("combines conditions with allOf, anyOf, and not", () => {
    const allOf: Condition = {
      kind: "allOf",
      conditions: [
        { kind: "counterCompare", counterId: "x", operator: "eq", value: 1 },
        { kind: "phaseActive", phaseOrders: [1] },
      ],
    };
    expect(evaluateCondition(allOf, ctx({ x: 1 }, 1))).toBe(true);
    expect(evaluateCondition(allOf, ctx({ x: 1 }, 2))).toBe(false);

    const anyOf: Condition = {
      kind: "anyOf",
      conditions: [
        { kind: "counterCompare", counterId: "x", operator: "eq", value: 99 },
        { kind: "phaseActive", phaseOrders: [1] },
      ],
    };
    expect(evaluateCondition(anyOf, ctx({ x: 1 }, 1))).toBe(true);

    const not: Condition = { kind: "not", condition: { kind: "phaseActive", phaseOrders: [1] } };
    expect(evaluateCondition(not, ctx({}, 1))).toBe(false);
    expect(evaluateCondition(not, ctx({}, 2))).toBe(true);
  });
});
