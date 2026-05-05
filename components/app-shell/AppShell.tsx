"use client";

import { AlgorithmSidebar } from "@/components/sidebar/AlgorithmSidebar";
import { SimulationWindow } from "@/components/simulation-window/SimulationWindow";

export function AppShell() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <AlgorithmSidebar />
      <SimulationWindow />
    </main>
  );
}
