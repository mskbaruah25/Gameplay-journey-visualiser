import type { Metadata } from "next";
import "./globals.css";
import "@/features/playback/styles/playback.css";
import "@/features/overview/styles/workspace.css";
import "@/features/playback/styles/combat-timeline.css";
import "@/features/playback/styles/marker-inspector.css";

export const metadata: Metadata = {
  title: "Gameplay Journey Visualizer",
  description: "An independent assessment project exploring LILA BLACK gameplay journeys, events, and heatmaps.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
