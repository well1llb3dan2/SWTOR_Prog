/**
 * Generic condition/trigger evaluator, modelled on BARAS's encounter DSL
 * (`all_of`/`any_of`/`not`, counter comparisons, phase-active checks).
 *
 * Conditions are declarative and stored on catalog data (e.g. a phase's
 * optional `guard`); evaluation is pure and takes a small context object so
 * callers can back it with whatever counter/phase state they're tracking.
 */

export type ConditionOperator = "eq" | "ne" | "lt" | "lte" | "gt" | "gte";

export type Condition =
  | { kind: "counterCompare"; counterId: string; operator: ConditionOperator; value: number }
  | { kind: "phaseActive"; phaseOrders: number[] }
  | { kind: "allOf"; conditions: Condition[] }
  | { kind: "anyOf"; conditions: Condition[] }
  | { kind: "not"; condition: Condition };

export interface ConditionContext {
  getCounter(counterId: string): number;
  currentPhaseOrder: number;
}

function compare(value: number, operator: ConditionOperator, target: number): boolean {
  switch (operator) {
    case "eq":
      return value === target;
    case "ne":
      return value !== target;
    case "lt":
      return value < target;
    case "lte":
      return value <= target;
    case "gt":
      return value > target;
    case "gte":
      return value >= target;
  }
}

export function evaluateCondition(condition: Condition, ctx: ConditionContext): boolean {
  switch (condition.kind) {
    case "counterCompare":
      return compare(ctx.getCounter(condition.counterId), condition.operator, condition.value);
    case "phaseActive":
      return condition.phaseOrders.includes(ctx.currentPhaseOrder);
    case "allOf":
      return condition.conditions.every((c) => evaluateCondition(c, ctx));
    case "anyOf":
      return condition.conditions.some((c) => evaluateCondition(c, ctx));
    case "not":
      return !evaluateCondition(condition.condition, ctx);
  }
}
