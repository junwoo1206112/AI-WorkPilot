# AI WorkPilot

한국어 업무 요청을 **계획 → 승인 → 실행 → 회고**로 전환하는 human-in-the-loop 에이전트 포트폴리오입니다. 화면만 그린 챗봇이 아니라 승인 불변조건, 어댑터 경계, 실행 이력과 실패 복구를 설계했습니다.

> 이 버전은 외부 API 키 없이 재현 가능한 **결정론적 시뮬레이션**입니다. 실제 메일·캘린더 작업을 수행하지 않으며 AI 정확도나 생산성 수치를 주장하지 않습니다.

## 1분 데모

1. `회의록을 분석해서 액션 아이템을 만들고 후속 일정을 등록해줘`를 계획으로 변환합니다.
2. `calendar.mock`, `mail.mock`의 높은 위험도와 승인 사유를 확인합니다.
3. 승인 전에는 서버 Executor가 직접 실행 요청도 거부합니다.
4. 승인 후 실행하면 구조화 감사 로그와 회고가 D1에 남습니다.
5. `배포 오류를 진단...` 예시는 의도적 실패 후 멱등 재시도를 보여줍니다.

## 채용 역량 → 구현 증거

| 역량 | 증거 |
|---|---|
| AI/에이전트 설계 | `Planner → Policy → Executor → History` 어댑터 구조 |
| 백엔드 안전성 | 서버 측 상태 머신과 승인 없는 실행 409 차단 |
| 데이터 모델링 | D1 실행·이벤트 저장, 익명 세션 소유권 격리 |
| 관측성 | run/step/tool 상태와 구조화 타임라인 |
| 오류 처리 | timeout 시뮬레이션, 실패 단계만 멱등 재시도 |
| 제품 설계 | 한국어 반응형 UI, 키보드 포커스, 정직한 DEMO 표시 |
| 개발 프로세스 | OpenSpec 변경 명세 + Ouroboros 인터뷰/3단계 평가 |

## Architecture

```text
Korean request
  → DeterministicPlanner (LLM adapter 교체 지점)
  → ApprovalPolicy (risk taxonomy + state invariant)
  → ToolExecutor (validate / preview / execute)
  → HistoryRepository (D1, owner-scoped append events)
```

상태는 `draft → awaiting_approval → approved → running → completed | failed | cancelled`를 따릅니다. 실제 연동에서는 Planner를 LLM provider로, `*.mock`을 메일·캘린더 SDK 구현으로 바꾸되 Policy와 History는 그대로 유지합니다.

## 실행

Node.js 22.13 이상에서:

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

D1 스키마는 첫 API 요청에서 멱등 초기화되며, Drizzle 선언은 `db/schema.ts`에 있습니다.

## 안전과 한계

- 입력은 2,000자로 제한하며 비밀번호·주민번호 등 민감정보를 넣지 않도록 안내합니다.
- 현재는 포트폴리오 데모로 실제 외부 업무 API 네트워크 호출이 없습니다.
- 익명 세션 토큰은 브라우저 로컬에 저장되고 서버 쿼리의 소유권 조건으로 사용됩니다.
- 실서비스 전환 시 인증, 토큰 회전, 데이터 삭제 정책, adapter별 secret 관리가 추가로 필요합니다.

명세와 의사결정은 `openspec/changes/build-ai-workpilot/`, 인터뷰 기록은 `docs/ouroboros-interview.md`에서 확인할 수 있습니다.
