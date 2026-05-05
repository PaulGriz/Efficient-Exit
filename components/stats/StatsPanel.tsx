"use client";

import { Users, DoorOpen, Gauge, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  selectAlgorithmDescriptor,
  useSimulationStore,
} from "@/features/simulation/stores/useSimulationStore";
import { useConfigStore } from "@/features/simulation/stores/useConfigStore";

const formatSeconds = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0.0s";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}m ${s.toFixed(1)}s`;
};

interface StatRowProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

function StatRow({ label, value, icon, highlight }: StatRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={
          highlight
            ? "font-heading text-sm font-semibold tabular-nums text-foreground"
            : "font-heading tabular-nums text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

export function StatsPanel() {
  const status = useSimulationStore((s) => s.status);
  const elapsedTime = useSimulationStore((s) => s.elapsedTime);
  const completionTime = useSimulationStore((s) => s.completionTime);
  const exitedCount = useSimulationStore((s) => s.exitedCount);
  const remainingCount = useSimulationStore((s) => s.remainingCount);
  const averageExitTime = useSimulationStore((s) => s.averageExitTime);
  const activeCollisions = useSimulationStore((s) => s.activeCollisions);
  const algorithm = useSimulationStore(selectAlgorithmDescriptor);
  const animationSpeed = useConfigStore((s) => s.simulationConfig.animationSpeed);

  const isComplete = status === "complete" && completionTime !== null;
  const totalPeople = exitedCount + remainingCount;

  return (
    <Card
      size="sm"
      className="pointer-events-auto w-72 border-border/60 bg-background/85 backdrop-blur"
      aria-live="polite"
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Live stats</span>
          <Badge variant={isComplete ? "default" : "outline"}>
            {isComplete ? "Final" : status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <StatRow
          label="Elapsed time"
          value={formatSeconds(elapsedTime)}
          icon={<Circle className="size-3" />}
          highlight={!isComplete}
        />
        <StatRow
          label="Completion time"
          value={completionTime !== null ? formatSeconds(completionTime) : "—"}
          icon={<Circle className="size-3" />}
          highlight={isComplete}
        />
        <StatRow
          label="Exited"
          value={`${exitedCount} / ${totalPeople}`}
          icon={<DoorOpen className="size-3" />}
        />
        <StatRow
          label="Remaining"
          value={`${remainingCount}`}
          icon={<Users className="size-3" />}
        />
        <StatRow
          label="Avg exit time"
          value={
            averageExitTime > 0 ? formatSeconds(averageExitTime) : "—"
          }
        />
        <StatRow
          label="Active collisions"
          value={`${activeCollisions}`}
        />
        <StatRow
          label="Algorithm"
          value={algorithm.name}
        />
        <StatRow
          label="Speed"
          value={`${animationSpeed.toFixed(2)}x`}
          icon={<Gauge className="size-3" />}
        />
      </CardContent>
    </Card>
  );
}
