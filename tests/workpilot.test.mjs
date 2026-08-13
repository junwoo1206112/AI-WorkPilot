import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
test("starter preview is fully removed", async () => {
  const [page, pkg] = await Promise.all([readFile(new URL("app/page.tsx", root), "utf8"), readFile(new URL("package.json", root), "utf8")]);
  assert.match(page, /WorkPilot/); assert.doesNotMatch(page, /codex-preview|SkeletonPreview/); assert.doesNotMatch(pkg, /react-loading-skeleton/);
});
test("approval is enforced in the server executor", async () => {
  const api = await readFile(new URL("app/api/runs/route.ts", root), "utf8");
  assert.match(api, /state !== "approved"/); assert.match(api, /status: 409/); assert.match(api, /owner = \?/); assert.match(api, /외부 호출 0건/);
});
test("planner exposes distinct Korean workflow fixtures and risk contract", async () => {
  const planner = await readFile(new URL("app/planner.ts", root), "utf8");
  for (const marker of ["회의록", "채용", "장애", "requiresApproval", "calendar.mock", "recovery.mock"]) assert.match(planner, new RegExp(marker));
});
test("OpenSpec contains safety and acceptance gates", async () => {
  const spec = await readFile(new URL("openspec/changes/build-ai-workpilot/specs/agent-workflow/spec.md", root), "utf8");
  assert.match(spec, /Enforced approval/); assert.match(spec, /Durable isolated history/); assert.match(spec, /Three Korean fixture/);
});
