import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";

const root = new URL("../", import.meta.url);

test("D1 migration creates owner-scoped run storage", async () => {
  const migration = await readFile(new URL("drizzle/0000_workpilot_runs.sql", root), "utf8");
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok"); } };',
    compatibilityDate: "2026-05-22",
    d1Databases: ["DB"],
  });

  try {
    const db = await mf.getD1Database("DB");
    for (const statement of migration.replaceAll("--> statement-breakpoint", "").split(";").map((value) => value.trim()).filter(Boolean)) {
      await db.prepare(statement).run();
    }
    await db.prepare("INSERT INTO workpilot_runs (id, owner, request, plan_json, state, events_json, attempt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind("run-a", "owner-a", "회의록 요약", "{}", "awaiting_approval", "[]", 0, "2026-08-20T00:00:00.000Z", "2026-08-20T00:00:00.000Z")
      .run();
    const owned = await db.prepare("SELECT id FROM workpilot_runs WHERE id = ? AND owner = ?").bind("run-a", "owner-a").first();
    const foreign = await db.prepare("SELECT id FROM workpilot_runs WHERE id = ? AND owner = ?").bind("run-a", "owner-b").first();
    const indexes = await db.prepare("PRAGMA index_list('workpilot_runs')").all();
    assert.equal(owned?.id, "run-a");
    assert.equal(foreign, null);
    assert.ok(indexes.results.some((index) => index.name === "workpilot_runs_owner_idx"));
  } finally {
    await mf.dispose();
  }
});
