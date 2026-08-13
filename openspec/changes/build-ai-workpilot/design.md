# Design

## Architecture
`Planner -> ApprovalPolicy -> ToolExecutor -> HistoryRepository` 경계를 유지한다. 현재 Planner와 ToolExecutor는 결정론적 데모 구현이며 실제 연동은 같은 계약으로 교체한다.

## State machine
`draft -> awaiting_approval -> approved -> running -> completed | failed | cancelled`

승인 거절은 `awaiting_approval -> rejected`, 계획 변경은 기존 승인을 무효화한다. 실행 ID는 멱등성 키로 사용한다.

## Safety invariants
1. `requiresApproval` 단계는 승인 전 실행될 수 없다.
2. 화면과 로그에 시뮬레이션임을 지속적으로 표시한다.
3. 입력은 2,000자로 제한하고 HTML로 실행하지 않는다.
4. 이력 조회와 쓰기는 세션 토큰으로 격리한다.
5. 로그는 append-only 이벤트로 남긴다.

## Risk taxonomy
- low: 읽기, 요약, 초안 생성
- medium: 내부 데이터 변경 시뮬레이션
- high: 외부 메시지·일정 생성과 같은 부작용 시뮬레이션 — 반드시 승인

