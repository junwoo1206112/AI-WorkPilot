import type { Metadata } from "next";
import { WorkPilot } from "./work-pilot";

export const metadata: Metadata = {
  title: "AI WorkPilot — 안전한 업무 에이전트 데모",
  description: "계획, 승인, 실행, 회고를 하나의 안전한 에이전트 워크플로로 보여주는 개발자 포트폴리오",
};

export default function Home() {
  return <WorkPilot />;
}
