# Design

## Architecture
`Planner -> ApprovalPolicy -> ToolExecutor -> HistoryRepository` 경계를 유지한다. 현재 Planner와 ToolExecutor는 결정론적 데모 구현이며 실제 연동은 같은 계약으로 교체한다.

## State machine
`draft -> awaiting_approval -> approved -> running -> completed | failed | cancelled`

승인 거절은 `awaiting_approval -> rejected`다. 현재 계획은 생성 후 불변이며, 변경은 새 실행 계획을 만드는 방식으로만 허용한다. 실행 상태 전이는 `UPDATE ... WHERE state = observedState` compare-and-swap으로 원자적으로 적용한다.

## Safety invariants
1. `requiresApproval` 단계는 승인 전 실행될 수 없다.
2. 화면과 로그에 시뮬레이션임을 지속적으로 표시한다.
3. 입력은 2,000자로 제한하고 HTML로 실행하지 않는다.
4. 이력 조회와 쓰기는 세션 토큰으로 격리한다.
5. 로그는 append-only 이벤트로 남긴다.
6. Planner와 위험 분류는 서버가 요청 원문으로 다시 계산하며, 클라이언트가 보낸 계획을 신뢰하지 않는다.
7. 같은 관측 상태에서 경쟁하는 두 전이 중 하나만 저장되며, 나머지는 `409 Conflict`를 받는다.

## Expert re-interview: iteration 2

| Expert question | Evidence-based answer | Change |
|---|---|---|
| 브라우저가 `requiresApproval=false`를 보내면? | 초기 버전은 계획 객체를 받았다. | 서버가 요청만 받고 Plan·risk를 재생성하도록 변경했다. |
| 상태 머신이 실제로 관찰되는가? | `approved`에서 즉시 terminal state로 갔다. | `running`과 `cancelled`를 추가하고 완료 이벤트를 분리했다. |
| 실패를 학습 가능한 결과로 보여주는가? | 로그만 있었고 회고가 없었다. | 완료·실패·시도 수와 다음 개선 제안을 회고 카드로 노출했다. |
| 테스트가 동작을 검증하는가? | 소스 문자열 검사 비중이 컸다. | 의도 분류, 위험도, 상태 전이를 직접 실행하는 테스트를 추가했다. |

## Risk taxonomy
- low: 읽기, 요약, 초안 생성
- medium: 내부 데이터 변경 시뮬레이션
- high: 외부 메시지·일정 생성과 같은 부작용 시뮬레이션 — 반드시 승인
