import type { Metadata } from "next";
import "./globals.css";
import "@/features/playback/styles/playback.css";

export const metadata: Metadata = {
  title: "Overview · LILA BLACK",
  description: "Explore recorded LILA BLACK journeys, events, and heatmaps.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
