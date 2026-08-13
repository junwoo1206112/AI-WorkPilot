export type Risk = "low" | "medium" | "high";
export type Step = { id: string; title: string; description: string; tool: string; risk: Risk; requiresApproval: boolean; expectedOutput: string };
export type Plan = { goal: string; summary: string; steps: Step[] };

const make = (id: string, title: string, description: string, tool: string, risk: Risk, expectedOutput: string): Step => ({
  id, title, description, tool, risk, requiresApproval: risk === "high", expectedOutput,
});

export function generatePlan(raw: string): Plan {
  const input = raw.trim().slice(0, 2000);
  const goal = input || "팀 업무를 정리하고 후속 조치를 준비합니다.";
  const common = make("s1", "요청 이해", "핵심 목표와 제약 조건을 구조화합니다.", "intent.analyzer", "low", "구조화된 목표");
  if (/회의|미팅|회의록/.test(input)) return { goal, summary: "회의 내용을 실행 가능한 후속 업무로 전환합니다.", steps: [common, make("s2", "액션 아이템 추출", "담당자와 기한 후보를 정리합니다.", "meeting.parser", "low", "액션 아이템 목록"), make("s3", "일정 등록", "후속 일정을 캘린더에 등록하는 과정을 시뮬레이션합니다.", "calendar.mock", "high", "일정 등록 미리보기"), make("s4", "요약 메일 준비", "참석자에게 보낼 결과 메일을 시뮬레이션합니다.", "mail.mock", "high", "메일 발송 미리보기") ] };
  if (/지원|채용|자소서|이력서/.test(input)) return { goal, summary: "채용 지원 자료를 분석하고 제출 준비 단계를 만듭니다.", steps: [common, make("s2", "요구 역량 매핑", "공고 키워드와 프로젝트 증거를 연결합니다.", "job.matcher", "low", "역량 매핑표"), make("s3", "지원서 초안", "근거 중심 지원 문장을 생성합니다.", "draft.writer", "medium", "지원서 초안"), make("s4", "제출 알림 예약", "마감 알림 생성을 시뮬레이션합니다.", "calendar.mock", "high", "알림 예약 미리보기") ] };
  if (/장애|실패|오류|버그/.test(input)) return { goal, summary: "장애를 재현하고 안전하게 복구하는 실패 시나리오입니다.", steps: [common, make("s2", "로그 진단", "오류 신호와 영향 범위를 분류합니다.", "log.analyzer", "low", "원인 후보"), make("s3", "복구 실행", "첫 시도는 의도적으로 실패해 재시도를 검증합니다.", "recovery.mock", "medium", "복구 결과"), make("s4", "상태 공지", "복구 결과 공지를 시뮬레이션합니다.", "mail.mock", "high", "상태 공지 미리보기") ] };
  return { goal, summary: "요청을 안전한 조사·초안·공유 단계로 나눕니다.", steps: [common, make("s2", "자료 조사", "필요 정보를 로컬 지식 기반에서 찾습니다.", "knowledge.search", "low", "근거 목록"), make("s3", "결과 초안", "검토 가능한 결과물을 작성합니다.", "draft.writer", "medium", "결과 초안"), make("s4", "공유 준비", "외부 공유 과정을 시뮬레이션합니다.", "mail.mock", "high", "공유 미리보기") ] };
}
