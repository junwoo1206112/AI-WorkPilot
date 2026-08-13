import { env } from "cloudflare:workers";
import { approvalRequired, generatePlan, nextState, validateRequest } from "../../workflow-core.mjs";

type Event = { at: string; label: string; detail: string; tone?: "ok" | "warn" | "fail" | ""; simulated: true };
type Plan = ReturnType<typeof generatePlan>;
type StoredRun = { id: string; owner: string; request: string; plan: Plan; state: string; events: Event[]; attempt: number; createdAt: string; updatedAt: string; simulated: true };
const schema = `CREATE TABLE IF NOT EXISTS workpilot_runs (id TEXT PRIMARY KEY, owner TEXT NOT NULL, request TEXT NOT NULL, plan_json TEXT NOT NULL, state TEXT NOT NULL, events_json TEXT NOT NULL, attempt INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`;
const ownerIndex = `CREATE INDEX IF NOT EXISTS workpilot_runs_owner_idx ON workpilot_runs (owner, created_at DESC)`;

function session(request: Request) {
  const value = request.headers.get("x-workpilot-session") ?? "";
  if (!/^[a-f0-9-]{16,64}$/i.test(value)) throw new Error("유효한 데모 세션이 필요합니다.");
  return value;
}
async function db() {
  if (!env.DB) throw new Error("D1 저장소가 연결되지 않았습니다.");
  await env.DB.batch([env.DB.prepare(schema), env.DB.prepare(ownerIndex)]);
  return env.DB;
}
function event(label: string, detail: string, tone: Event["tone"] = "") : Event { return { at: new Date().toISOString(), label, detail, tone, simulated: true }; }
function rowToRun(row: Record<string, unknown>): StoredRun {
  const rawEvents = JSON.parse(String(row.events_json)) as Array<Event & { time?: string }>;
  return { id: String(row.id), owner: String(row.owner), request: String(row.request), plan: JSON.parse(String(row.plan_json)), state: String(row.state), events: rawEvents.map(item => ({ ...item, at: item.at ?? new Date().toISOString(), simulated: true })), attempt: Number(row.attempt), createdAt: String(row.created_at), updatedAt: String(row.updated_at), simulated: true };
}
async function getOwned(database: D1Database, id: string, owner: string) {
  const row = await database.prepare("SELECT * FROM workpilot_runs WHERE id = ? AND owner = ?").bind(id, owner).first();
  return row ? rowToRun(row) : null;
}
function invalidState(state: string, action: string) { return Response.json({ error: `현재 상태(${state})에서는 ${action} 작업을 수행할 수 없습니다.` }, { status: 409 }); }

export async function GET(request: Request) {
  try {
    const owner = session(request); const database = await db();
    const result = await database.prepare("SELECT * FROM workpilot_runs WHERE owner = ? ORDER BY created_at DESC, id DESC LIMIT 20").bind(owner).all();
    return Response.json({ runs: result.results.map(rowToRun) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "이력 조회 실패" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const owner = session(request); const payload = await request.json() as { request?: unknown };
    const validated = validateRequest(payload.request);
    if (!validated.ok) return Response.json({ error: validated.reason }, { status: 400 });
    // The server is the source of truth: it derives the plan and risk policy
    // itself and intentionally ignores any client-supplied plan fields.
    const plan = generatePlan(validated.request); const database = await db();
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    const state = approvalRequired(plan) ? "awaiting_approval" : "approved";
    const events = [event("계획 생성", "서버 Planner가 요청에서 실행 계약을 생성했습니다."), event("정책 검사", state === "awaiting_approval" ? "외부 부작용 단계가 있어 사람의 승인을 대기합니다." : "승인 없이 실행 가능한 읽기 전용 계획입니다.", "warn")];
    await database.prepare("INSERT INTO workpilot_runs (id, owner, request, plan_json, state, events_json, attempt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)").bind(id, owner, validated.request, JSON.stringify(plan), state, JSON.stringify(events), now, now).run();
    return Response.json({ run: await getOwned(database, id, owner) }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "계획 저장 실패" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const owner = session(request); const { id, action } = await request.json() as { id?: string; action?: string };
    if (!id || !action) return Response.json({ error: "실행 ID와 작업이 필요합니다." }, { status: 400 });
    const database = await db(); const run = await getOwned(database, id, owner);
    if (!run) return Response.json({ error: "이 세션에서 실행을 찾을 수 없습니다." }, { status: 404 });
    const events = [...run.events]; let state = nextState(run.state, action); let attempt = run.attempt; let message = "상태가 변경되었습니다.";
    if (!state) return invalidState(run.state, action);

    if (action === "approve") { events.push(event("사람의 승인", "현재 계획 버전의 고위험 시뮬레이션을 승인했습니다.", "ok")); message = "승인되었습니다. 이제 실행할 수 있습니다."; }
    if (action === "reject") { events.push(event("승인 거절", "실행하지 않고 안전하게 종료했습니다.", "fail")); message = "계획을 거절했습니다. 어떤 도구도 실행되지 않았습니다."; }
    if (action === "execute" || action === "retry") {
      // `approved` is checked by nextState; there is no executor entry point
      // for an awaiting-approval run, even if the UI is bypassed.
      attempt += 1;
      events.push(event(action === "retry" ? "실패 단계 재시도" : "도구 실행 시작", `${attempt}차 시뮬레이션 실행을 시작했습니다. 외부 업무 API 호출은 0건입니다.`, "ok"));
      message = action === "retry" ? "실패한 단계만 재시도 중입니다." : "승인된 계획을 시뮬레이션 실행 중입니다.";
    }
    if (action === "complete") {
      const shouldFail = /장애|실패|오류|버그/.test(run.request) && attempt === 1;
      state = shouldFail ? "failed" : "completed";
      events.push(shouldFail ? event("복구 어댑터 실패", "의도된 timeout을 포착했습니다. 완료 단계는 보존되고 재시도할 수 있습니다.", "fail") : event("시뮬레이션 완료", "모든 단계가 멱등 실행됐고 구조화 로그가 저장됐습니다.", "ok"));
      message = shouldFail ? "의도된 실패를 포착했습니다. 재시도로 복구 흐름을 검증하세요." : "시뮬레이션이 완료되었습니다. 실제 외부 작업은 수행되지 않았습니다.";
    }
    if (action === "cancel") { events.push(event("실행 취소", "후속 단계를 실행하지 않고 시뮬레이션을 종료했습니다.", "warn")); message = "실행을 취소했습니다. 완료된 단계는 감사 로그에 남아 있습니다."; }

    // Compare-and-swap: only one request may move an observed state forward.
    // A competing request sees zero changed rows and receives a conflict instead
    // of starting a duplicate external adapter call in a future real provider.
    const transition = await database.prepare("UPDATE workpilot_runs SET state = ?, events_json = ?, attempt = ?, updated_at = ? WHERE id = ? AND owner = ? AND state = ?").bind(state, JSON.stringify(events), attempt, new Date().toISOString(), id, owner, run.state).run();
    if ((transition.meta?.changes ?? 0) !== 1) return Response.json({ error: "다른 요청이 먼저 실행 상태를 변경했습니다. 최신 이력을 확인해주세요." }, { status: 409 });
    return Response.json({ run: await getOwned(database, id, owner), message });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "상태 변경 실패" }, { status: 500 }); }
}
