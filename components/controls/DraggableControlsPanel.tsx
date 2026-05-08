"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical, Settings2, X } from "lucide-react";
import { clamp } from "@/lib/math/aabb";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  selectMaxPeople,
  useConfigStore,
} from "@/features/simulation/stores/useConfigStore";
import {
  clampActiveExitDirections,
  formatExitDirectionsLabel,
} from "@/features/simulation/pathing/waypointPlanner";
import { useSimulationStore } from "@/features/simulation/stores/useSimulationStore";
import {
  isControlsPanelPositionSentinel,
  useUiStore,
} from "@/features/simulation/stores/useUiStore";

const PANEL_WIDTH = 320;
const PANEL_MARGIN = 16;
/**
 * Soft cap on the panel height. The panel always also respects the available
 * vertical space below its current top offset, but this prevents it from
 * growing into a giant column on very tall viewports.
 */
const PANEL_MAX_HEIGHT_CAP = 720;

interface FieldProps {
  label: string;
  value: string;
  children: React.ReactNode;
  description?: string;
}

function Field({ label, value, description, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-heading text-[0.625rem] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="font-heading text-xs font-medium tabular-nums text-foreground">
          {value}
        </span>
      </div>
      {children}
      {description ? (
        <p className="text-[0.625rem] leading-snug text-muted-foreground/80">
          {description}
        </p>
      ) : null}
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  description?: string;
  onChange: (next: boolean) => void;
}

function ToggleRow({ label, value, onChange, description }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="font-heading text-xs">{label}</span>
        {description ? (
          <span className="text-[0.625rem] text-muted-foreground/80">
            {description}
          </span>
        ) : null}
      </div>
      <Switch
        checked={value}
        onCheckedChange={onChange}
        aria-label={label}
      />
    </div>
  );
}

interface ControlsCardProps {
  position: { x: number; y: number };
  containerSize: { width: number; height: number };
  panelSize: { width: number; height: number };
  registerPanel: (node: HTMLDivElement | null) => void;
}

function ControlsCard({
  position,
  containerSize,
  panelSize,
  registerPanel,
}: ControlsCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: "controls-panel" });

  const setPanelOpen = useUiStore((s) => s.setControlsPanelOpen);

  const room = useConfigStore((s) => s.roomConfig);
  const sim = useConfigStore((s) => s.simulationConfig);
  const setRoomConfig = useConfigStore((s) => s.setRoomConfig);
  const setSimulationConfig = useConfigStore((s) => s.setSimulationConfig);
  const maxPeople = useConfigStore(selectMaxPeople);
  const debug = useUiStore((s) => s.debug);
  const setDebug = useUiStore((s) => s.setDebug);
  const reset = useSimulationStore((s) => s.reset);

  const tx = (transform?.x ?? 0) + position.x;
  const ty = (transform?.y ?? 0) + position.y;
  const safeWidth = Math.max(containerSize.width - PANEL_WIDTH, 0);
  const safeHeight = Math.max(containerSize.height - panelSize.height, 0);
  const clampedX = clamp(tx, 0, safeWidth);
  const clampedY = clamp(ty, 0, safeHeight);

  /**
   * Maximum height the panel may grow to right now. We always leave a
   * margin so the panel never hugs the bottom edge, and we cap at a sane
   * value on tall viewports.
   */
  const maxPanelHeight = Math.max(
    Math.min(
      PANEL_MAX_HEIGHT_CAP,
      containerSize.height - clampedY - PANEL_MARGIN,
    ),
    240,
  );

  const composedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      registerPanel(node);
    },
    [registerPanel, setNodeRef],
  );

  return (
    <div
      ref={composedRef}
      style={{
        transform: `translate3d(${clampedX}px, ${clampedY}px, 0)`,
        width: PANEL_WIDTH,
        maxHeight: maxPanelHeight,
      }}
      className={cn(
        "pointer-events-auto absolute top-0 left-0 flex select-none flex-col",
        isDragging && "z-50",
      )}
    >
      <Card
        size="sm"
        className="flex max-h-full min-h-0 flex-col border-border/60 bg-background/90 shadow-xl backdrop-blur"
      >
        <CardHeader className="shrink-0">
          <CardTitle className="flex items-center gap-2">
            <button
              type="button"
              {...listeners}
              {...attributes}
              aria-label="Drag controls panel"
              className="-ml-1 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical className="size-3.5" />
            </button>
            <Settings2 className="size-3.5 text-muted-foreground" />
            <span>Simulation controls</span>
            <Button
              size="icon-xs"
              variant="ghost"
              className="ml-auto"
              onClick={() => setPanelOpen(false)}
              aria-label="Close controls panel"
            >
              <X />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
          <Field
            label="Rows"
            value={`${room.rowCount}`}
            description="Number of seating rows from front to back."
          >
            <Slider
              value={[room.rowCount]}
              min={2}
              max={20}
              step={1}
              onValueChange={(values) => {
                const next = values[0];
                if (typeof next === "number") {
                  setRoomConfig({ rowCount: next });
                  reset();
                }
              }}
              aria-label="Number of rows"
            />
          </Field>

          <Field
            label="Chairs per side"
            value={`${room.chairsPerHalfRow}`}
            description="Chairs in each row half (each row has 2× this)."
          >
            <Slider
              value={[room.chairsPerHalfRow]}
              min={1}
              max={12}
              step={1}
              onValueChange={(values) => {
                const next = values[0];
                if (typeof next === "number") {
                  setRoomConfig({ chairsPerHalfRow: next });
                  reset();
                }
              }}
              aria-label="Chairs per row half"
            />
          </Field>

          <Field
            label="People"
            value={`${sim.peopleCount} / ${maxPeople}`}
            description="Number of seats actually occupied."
          >
            <Slider
              value={[sim.peopleCount]}
              min={0}
              max={maxPeople}
              step={1}
              onValueChange={(values) => {
                const next = values[0];
                if (typeof next === "number") {
                  setSimulationConfig({ peopleCount: next });
                  reset();
                }
              }}
              aria-label="Number of people"
            />
          </Field>

          <Separator />

          <Field
            label="Aisle width"
            value={`${room.aisleWidth.toFixed(2)} m`}
          >
            <Slider
              value={[room.aisleWidth]}
              min={0.6}
              max={3}
              step={0.1}
              onValueChange={(values) => {
                const next = values[0];
                if (typeof next === "number") {
                  setRoomConfig({ aisleWidth: next });
                  reset();
                }
              }}
              aria-label="Aisle width"
            />
          </Field>

          <Field
            label="Exit width"
            value={`${room.exitWidth.toFixed(2)} m`}
          >
            <Slider
              value={[room.exitWidth]}
              min={0.6}
              max={4}
              step={0.1}
              onValueChange={(values) => {
                const next = values[0];
                if (typeof next === "number") {
                  setRoomConfig({ exitWidth: next });
                  reset();
                }
              }}
              aria-label="Exit width"
            />
          </Field>

          <Field
            label="Exit directions"
            value={formatExitDirectionsLabel(sim.activeExitDirections)}
            description="Adds exits in order: south, north, east, then west."
          >
            <Slider
              value={[sim.activeExitDirections]}
              min={1}
              max={4}
              step={1}
              onValueChange={(values) => {
                const next = values[0];
                if (typeof next === "number") {
                  setSimulationConfig({
                    activeExitDirections: clampActiveExitDirections(next),
                  });
                  reset();
                }
              }}
              aria-label="Number of active exit directions"
            />
          </Field>

          <Separator />

          <Field
            label="Person speed"
            value={`${sim.personSpeed.toFixed(2)} m/s`}
          >
            <Slider
              value={[sim.personSpeed]}
              min={0.4}
              max={3}
              step={0.05}
              onValueChange={(values) => {
                const next = values[0];
                if (typeof next === "number") {
                  setSimulationConfig({ personSpeed: next });
                  reset();
                }
              }}
              aria-label="Person walking speed"
            />
          </Field>

          <Field
            label="Collision padding"
            value={`${(sim.collisionPadding * 100).toFixed(0)} cm`}
            description="Extra space each person tries to keep around their AABB."
          >
            <Slider
              value={[sim.collisionPadding]}
              min={0}
              max={0.4}
              step={0.01}
              onValueChange={(values) => {
                const next = values[0];
                if (typeof next === "number") {
                  setSimulationConfig({ collisionPadding: next });
                  reset();
                }
              }}
              aria-label="Collision padding"
            />
          </Field>

          <Field
            label="Departure interval"
            value={`${sim.departureInterval.toFixed(2)} s`}
            description="Pause between successive release bursts."
          >
            <Slider
              value={[sim.departureInterval]}
              min={0}
              max={2}
              step={0.05}
              onValueChange={(values) => {
                const next = values[0];
                if (typeof next === "number") {
                  setSimulationConfig({ departureInterval: next });
                }
              }}
              aria-label="Departure interval"
            />
          </Field>

          <Field
            label="Burst size"
            value={`${sim.burstSize}`}
            description="People released per burst from the algorithm."
          >
            <Slider
              value={[sim.burstSize]}
              min={1}
              max={8}
              step={1}
              onValueChange={(values) => {
                const next = values[0];
                if (typeof next === "number") {
                  setSimulationConfig({ burstSize: next });
                  reset();
                }
              }}
              aria-label="Departure burst size"
            />
          </Field>

          <Separator />

          <ToggleRow
            label="Show exit zone"
            value={debug.showExitZone}
            onChange={(v) => setDebug({ showExitZone: v })}
            description="Highlight the exit threshold."
          />
          <ToggleRow
            label="Show paths"
            value={debug.showPaths}
            onChange={(v) => setDebug({ showPaths: v })}
            description="Draw waypoint polylines for every guest."
          />
          <ToggleRow
            label="Show collision boxes"
            value={debug.showCollisionBoxes}
            onChange={(v) => setDebug({ showCollisionBoxes: v })}
            description="Wireframe each person's collision AABB."
          />

          <Badge
            variant="outline"
            className="self-start font-heading text-[0.625rem]"
          >
            Drag the handle to reposition
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

interface DraggableControlsPanelProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function DraggableControlsPanel({
  containerRef,
}: DraggableControlsPanelProps) {
  const open = useUiStore((s) => s.controlsPanelOpen);
  const position = useUiStore((s) => s.controlsPanelPosition);
  const setPosition = useUiStore((s) => s.setControlsPanelPosition);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });
  const [panelNode, setPanelNode] = useState<HTMLDivElement | null>(null);
  const [panelSize, setPanelSize] = useState({
    width: PANEL_WIDTH,
    height: 200,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentRect;
      setContainerSize({ width: box.width, height: box.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  useEffect(() => {
    if (!panelNode) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentRect;
      setPanelSize({ width: box.width, height: box.height });
    });
    observer.observe(panelNode);
    return () => observer.disconnect();
  }, [panelNode]);

  const registerPanel = useCallback((node: HTMLDivElement | null) => {
    setPanelNode(node);
  }, []);

  // First-mount default: snap the panel to the top-right of the simulation
  // viewport so it doesn't collide with the bottom-left stats panel.
  useEffect(() => {
    if (containerSize.width <= 1) return;
    if (!isControlsPanelPositionSentinel(position)) return;
    setPosition({
      x: Math.max(containerSize.width - PANEL_WIDTH - PANEL_MARGIN, PANEL_MARGIN),
      y: PANEL_MARGIN,
    });
  }, [containerSize.width, position, setPosition]);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const next = {
        x: clamp(
          position.x + event.delta.x,
          0,
          Math.max(containerSize.width - PANEL_WIDTH, 0),
        ),
        y: clamp(
          position.y + event.delta.y,
          0,
          Math.max(containerSize.height - panelSize.height, 0),
        ),
      };
      setPosition(next);
    },
    [
      containerSize.height,
      containerSize.width,
      panelSize.height,
      position.x,
      position.y,
      setPosition,
    ],
  );

  const overlayClass = useMemo(
    () => "pointer-events-none absolute inset-0 overflow-hidden",
    [],
  );

  if (!open) return null;
  if (isControlsPanelPositionSentinel(position)) return null;

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className={overlayClass} aria-hidden={false}>
        <ControlsCard
          position={position}
          containerSize={containerSize}
          panelSize={panelSize}
          registerPanel={registerPanel}
        />
      </div>
    </DndContext>
  );
}
