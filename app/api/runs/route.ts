import { env } from "cloudflare:workers";

type StoredRun = { id: string; owner: string; request: string; plan: unknown; state: string; events: unknown[]; attempt: number; createdAt: string };
const schema = `CREATE TABLE IF NOT EXISTS workpilot_runs (id TEXT PRIMARY KEY, owner TEXT NOT NULL, request TEXT NOT NULL, plan_json TEXT NOT NULL, state TEXT NOT NULL, events_json TEXT NOT NULL, attempt INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`;
const ownerIndex = `CREATE INDEX IF NOT EXISTS workpilot_runs_owner_idx ON workpilot_runs (owner, created_at DESC)`;

function session(request: Request) {
  const value = request.headers.get("x-workpilot-session") ?? "";
  if (!/^[a-f0-9-]{16,64}$/i.test(value)) throw new Error("유효한 데모 세션이 필요합니다.");
  return value;
}
async function db() { if (!env.DB) throw new Error("D1 저장소가 연결되지 않았습니다."); await env.DB.batch([env.DB.prepare(schema), env.DB.prepare(ownerIndex)]); return env.DB; }
function event(label: string, detail: string, tone = "") { return { time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), label, detail, tone }; }
function rowToRun(row: Record<string, unknown>): StoredRun & { simulated: true } { return { id: String(row.id), owner: String(row.owner), request: String(row.request), plan: JSON.parse(String(row.plan_json)), state: String(row.state), events: JSON.parse(String(row.events_json)), attempt: Number(row.attempt), createdAt: String(row.created_at), simulated: true }; }
async function getOwned(database: D1Database, id: string, owner: string) { const row = await database.prepare("SELECT * FROM workpilot_runs WHERE id = ? AND owner = ?").bind(id, owner).first(); return row ? rowToRun(row) : null; }

export async function GET(request: Request) {
  try { const owner = session(request); const database = await db(); const result = await database.prepare("SELECT * FROM workpilot_runs WHERE owner = ? ORDER BY created_at DESC, id DESC LIMIT 20").bind(owner).all(); return Response.json({ runs: result.results.map(rowToRun) }); }
  catch (e) { return Response.json({ error: e instanceof Error ? e.message : "이력 조회 실패" }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const owner = session(request); const database = await db(); const payload = await request.json() as { request?: string; plan?: { steps?: { requiresApproval?: boolean }[] } };
    const text = payload.request?.trim() ?? ""; if (!text || text.length > 2000 || !payload.plan?.steps?.length) return Response.json({ error: "1~2,000자의 유효한 요청과 계획이 필요합니다." }, { status: 400 });
    const id = crypto.randomUUID(); const now = new Date().toISOString(); const state = payload.plan.steps.some(s=>s.requiresApproval) ? "awaiting_approval" : "approved"; const events = [event("계획 생성", "결정론적 Planner가 실행 계약을 생성했습니다."), event("정책 검사", state === "awaiting_approval" ? "외부 부작용 단계가 있어 승인을 대기합니다." : "승인 없이 실행 가능한 계획입니다.", "warn")];
    await database.prepare("INSERT INTO workpilot_runs (id, owner, request, plan_json, state, events_json, attempt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)").bind(id, owner, text, JSON.stringify(payload.plan), state, JSON.stringify(events), now, now).run();
    return Response.json({ run: await getOwned(database, id, owner) }, { status: 201 });
  } catch (e) { return Response.json({ error: e instanceof Error ? e.message : "계획 저장 실패" }, { status: 500 }); }
}
export async function PATCH(request: Request) {
  try {
    const owner = session(request); const database = await db(); const { id, action } = await request.json() as { id?: string; action?: string }; if (!id) return Response.json({ error: "실행 ID가 필요합니다." }, { status: 400 });
    const run = await getOwned(database, id, owner); if (!run) return Response.json({ error: "이 세션에서 실행을 찾을 수 없습니다." }, { status: 404 });
    const events = [...run.events] as unknown[]; let state = run.state; let attempt = run.attempt; let message = "상태가 변경되었습니다.";
    if (action === "approve" && state === "awaiting_approval") { state = "approved"; events.push(event("사람의 승인", "현재 계획 버전의 고위험 시뮬레이션을 승인했습니다.", "ok")); message = "승인되었습니다. 이제 실행할 수 있습니다."; }
    else if (action === "reject" && state === "awaiting_approval") { state = "rejected"; events.push(event("승인 거절", "실행하지 않고 안전하게 종료했습니다.", "fail")); message = "계획을 거절했습니다. 어떤 도구도 실행되지 않았습니다."; }
    else if (action === "execute") {
      if (state !== "approved") return Response.json({ error: "승인되지 않은 계획은 서버 Executor가 실행을 거부합니다." }, { status: 409 });
      state = /장애|실패|오류|버그/.test(run.request) && attempt === 0 ? "failed" : "completed"; attempt += 1; events.push(event("도구 실행 시작", `시뮬레이션 어댑터 ${attempt}차 실행 · 외부 호출 0건`, "ok")); events.push(state === "failed" ? event("복구 어댑터 실패", "의도된 timeout을 포착했습니다. 재시도 가능합니다.", "fail") : event("시뮬레이션 완료", "모든 단계가 멱등 실행되었고 구조화 로그가 저장됐습니다.", "ok")); message = state === "failed" ? "의도된 실패를 포착했습니다. 재시도로 복구 흐름을 검증하세요." : "시뮬레이션이 완료되었습니다. 실제 외부 작업은 수행되지 않았습니다.";
    } else if (action === "retry" && state === "failed") { state = "completed"; attempt += 1; events.push(event("실패 단계 재시도", "완료 단계는 건너뛰고 실패한 recovery.mock만 다시 실행했습니다.", "ok")); events.push(event("복구 완료", "2차 시도 성공 · 중복 외부 호출 0건", "ok")); message = "실패 단계만 재시도해 복구했습니다."; }
    else return Response.json({ error: `현재 상태(${state})에서 ${action} 작업은 허용되지 않습니다.` }, { status: 409 });
    await database.prepare("UPDATE workpilot_runs SET state = ?, events_json = ?, attempt = ?, updated_at = ? WHERE id = ? AND owner = ?").bind(state, JSON.stringify(events), attempt, new Date().toISOString(), id, owner).run();
    return Response.json({ run: await getOwned(database, id, owner), message });
  } catch (e) { return Response.json({ error: e instanceof Error ? e.message : "상태 변경 실패" }, { status: 500 }); }
}
