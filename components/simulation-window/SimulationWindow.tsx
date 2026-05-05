"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { TopControls } from "./TopControls";
import { StatsPanel } from "@/components/stats/StatsPanel";
import { DraggableControlsPanel } from "@/components/controls/DraggableControlsPanel";

const SimulationCanvas = dynamic(
  () =>
    import("@/features/simulation/components/SimulationCanvas").then(
      (mod) => mod.SimulationCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center text-muted-foreground">
        Loading simulation…
      </div>
    ),
  },
);

export function SimulationWindow() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section
      className="flex min-w-0 flex-1 flex-col bg-background"
      aria-label="Simulation viewport"
    >
      <TopControls />
      <div ref={containerRef} className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <SimulationCanvas />
        </div>

        <DraggableControlsPanel containerRef={containerRef} />

        <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-2">
          <StatsPanel />
        </div>
      </div>
    </section>
  );
}
