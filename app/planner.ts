export type Risk = "low" | "medium" | "high";
export type Step = { id: string; title: string; description: string; tool: string; inputs: string[]; risk: Risk; requiresApproval: boolean; expectedOutput: string };
export type Plan = { goal: string; summary: string; steps: Step[] };

export { generatePlan } from "./workflow-core.mjs";
