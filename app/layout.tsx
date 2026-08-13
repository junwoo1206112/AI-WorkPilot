import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI WorkPilot",
  description: "Human-in-the-loop AI workflow portfolio",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "AI WorkPilot", description: "Plan · Approve · Execute · Learn", images: ["/workpilot-social.png"] },
  twitter: { card: "summary_large_image", title: "AI WorkPilot", description: "Safe human-in-the-loop workflow agent", images: ["/workpilot-social.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
