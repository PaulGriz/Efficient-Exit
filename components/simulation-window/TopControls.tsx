"use client";

import {
  Eye,
  EyeOff,
  Gauge,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  StepForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConfigStore } from "@/features/simulation/stores/useConfigStore";
import { useSimulationStore } from "@/features/simulation/stores/useSimulationStore";
import { useUiStore } from "@/features/simulation/stores/useUiStore";

const SPEED_PRESETS = [0.5, 1, 2, 4];

export function TopControls() {
  const status = useSimulationStore((s) => s.status);
  const togglePlayPause = useSimulationStore((s) => s.togglePlayPause);
  const reset = useSimulationStore((s) => s.reset);
  const step = useSimulationStore((s) => s.step);

  const animationSpeed = useConfigStore((s) => s.simulationConfig.animationSpeed);
  const setSimulationConfig = useConfigStore((s) => s.setSimulationConfig);

  const controlsPanelOpen = useUiStore((s) => s.controlsPanelOpen);
  const toggleControlsPanel = useUiStore((s) => s.toggleControlsPanel);
  const showCollisionBoxes = useUiStore((s) => s.debug.showCollisionBoxes);
  const setDebug = useUiStore((s) => s.setDebug);
  const requestCameraReset = useUiStore((s) => s.requestCameraReset);

  const isPlaying = status === "playing";
  const isComplete = status === "complete";

  return (
    <TooltipProvider>
      <div
        className="flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-4 py-2 backdrop-blur"
        role="toolbar"
        aria-label="Playback controls"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isPlaying ? "secondary" : "default"}
              size="sm"
              onClick={togglePlayPause}
              disabled={isComplete}
              aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
            >
              {isPlaying ? <Pause /> : <Play />}
              <span className="font-heading">{isPlaying ? "Pause" : "Play"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isPlaying ? "Pause the simulation" : "Start or resume the simulation"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => step(0.25)}
              disabled={isComplete}
              aria-label="Step forward 0.25 seconds"
            >
              <StepForward />
              <span className="font-heading">Step</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Advance the simulation by 0.25 s</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              aria-label="Reset simulation"
            >
              <RotateCcw />
              <span className="font-heading">Reset</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rebuild the room and re-seat everyone</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <div className="flex items-center gap-2">
          <Gauge className="size-3.5 text-muted-foreground" />
          <span className="font-heading text-[0.625rem] uppercase tracking-wide text-muted-foreground">
            Speed
          </span>
          <div className="flex w-40 items-center gap-2">
            <Slider
              value={[animationSpeed]}
              min={0.25}
              max={6}
              step={0.25}
              onValueChange={(values) => {
                const next = values[0];
                if (typeof next === "number") {
                  setSimulationConfig({ animationSpeed: next });
                }
              }}
              aria-label="Animation speed multiplier"
            />
            <Badge variant="outline" className="min-w-12 justify-center font-heading">
              {animationSpeed.toFixed(2)}x
            </Badge>
          </div>
          <div className="hidden gap-1 md:flex">
            {SPEED_PRESETS.map((preset) => (
              <Button
                key={preset}
                size="xs"
                variant={preset === animationSpeed ? "secondary" : "ghost"}
                onClick={() => setSimulationConfig({ animationSpeed: preset })}
                aria-pressed={preset === animationSpeed}
                aria-label={`Set animation speed to ${preset} times`}
              >
                {preset}x
              </Button>
            ))}
          </div>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={requestCameraReset}
              aria-label="Reset camera view"
            >
              <Maximize />
              <span className="font-heading">Reset view</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Recentre and zoom-fit the room. Drag the canvas to pan, scroll to zoom.
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showCollisionBoxes ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                setDebug({ showCollisionBoxes: !showCollisionBoxes })
              }
              aria-pressed={showCollisionBoxes}
              aria-label="Toggle collision debug overlay"
            >
              {showCollisionBoxes ? <Eye /> : <EyeOff />}
              <span className="font-heading">Debug</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Show / hide collision bounding boxes</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={controlsPanelOpen ? "secondary" : "outline"}
              size="sm"
              onClick={toggleControlsPanel}
              aria-pressed={controlsPanelOpen}
              aria-label="Toggle floating controls panel"
            >
              <SlidersHorizontal />
              <span className="font-heading">Controls</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Show / hide floating controls panel</TooltipContent>
        </Tooltip>

        {isComplete ? (
          <Badge variant="default" className="ml-auto font-heading uppercase">
            Complete
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto font-heading uppercase">
            {status}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}
