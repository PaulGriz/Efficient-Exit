"use client";

import { ChevronRight, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ALGORITHMS } from "@/features/simulation/algorithms/registry";
import { useSimulationStore } from "@/features/simulation/stores/useSimulationStore";
import { useUiStore } from "@/features/simulation/stores/useUiStore";

export function AlgorithmSidebar() {
  const selectedId = useSimulationStore((s) => s.selectedAlgorithmId);
  const setAlgorithm = useSimulationStore((s) => s.setAlgorithm);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "relative h-full shrink-0 border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        sidebarOpen ? "w-72" : "w-12",
      )}
      aria-label="Exit algorithm selection"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <div
          className={cn(
            "flex min-w-0 flex-col",
            sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <span className="font-heading text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            Exit algorithms
          </span>
          <span className="truncate text-[0.625rem] text-muted-foreground/70">
            Choose a strategy and reset to compare
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <PanelLeft />
        </Button>
      </div>

      <Separator />

      {sidebarOpen ? (
        <nav className="flex flex-col gap-1 p-2" aria-label="Algorithm list">
          {ALGORITHMS.map((descriptor) => {
            const active = descriptor.id === selectedId;
            return (
              <button
                key={descriptor.id}
                type="button"
                onClick={() => setAlgorithm(descriptor.id)}
                aria-pressed={active}
                className={cn(
                  "group flex w-full flex-col items-start gap-1 rounded-md border border-transparent px-3 py-2 text-left transition-colors",
                  "hover:border-border hover:bg-muted/40",
                  active && "border-primary/40 bg-primary/10",
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-heading text-xs font-medium">
                    {descriptor.name}
                  </span>
                  {active ? (
                    <Badge variant="default" className="h-4 px-1.5">
                      Active
                    </Badge>
                  ) : (
                    <ChevronRight className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
                <p className="text-[0.625rem] leading-snug text-muted-foreground">
                  {descriptor.description}
                </p>
              </button>
            );
          })}
        </nav>
      ) : null}
    </aside>
  );
}
