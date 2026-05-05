import type { Vec2 } from "@/lib/math/aabb";
import type { Chair } from "./chair";

export type PersonState =
  | "seated"
  | "standing"
  | "moving"
  | "waiting"
  | "exited";

export interface Person {
  id: string;
  chairId: string;
  rowIndex: number;
  columnIndex: number;
  side: "left" | "right";
  /** Seat origin (kept for path planning + reset). */
  origin: Vec2;
  position: Vec2;
  /** Pre-computed waypoint sequence from seat to the exit. */
  waypoints: Vec2[];
  waypointIndex: number;
  state: PersonState;
  /** Total simulation time at which the person was released to walk. */
  releasedAt: number | null;
  /** Total simulation time at which the person crossed the exit threshold. */
  exitedAt: number | null;
  /** Per-person speed multiplier (kept open for future variance). */
  speed: number;
  width: number;
  depth: number;
  /** Whether the person is blocked by another person on this frame. */
  blocked: boolean;
  /**
   * Randomised display colour assigned at build time, so each guest is
   * visually distinguishable in the crowd. CSS-style `hsl(...)` string.
   */
  color: string;
}

export interface PersonInit {
  chair: Chair;
  width: number;
  depth: number;
  speed: number;
  waypoints: Vec2[];
  color: string;
}

let counter = 0;

const nextId = (): string => {
  counter += 1;
  return `person-${counter}`;
};

export const resetPersonIdCounter = (): void => {
  counter = 0;
};

/**
 * Visually distinct colours via the golden-angle hue distribution. Adjacent
 * indices land far apart on the colour wheel, which matters in a crowded
 * lane where each guest is only a few centimetres from the next one.
 *
 * The phase shift is randomised once per build so each reset gives a fresh
 * palette without losing the within-build distinguishability.
 */
const GOLDEN_ANGLE_DEG = 137.508;

export const createColorPalette = (count: number): string[] => {
  const phaseShift = Math.random() * 360;
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * GOLDEN_ANGLE_DEG + phaseShift) % 360;
    // Vivid mid-tone HSL: saturated enough to stand out on the dark floor,
    // but not pure neon so the ones tagged "blocked" (red) still pop.
    const saturation = 72;
    const lightness = 60;
    colors.push(`hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`);
  }
  return colors;
};

export const createPerson = (init: PersonInit): Person => ({
  id: nextId(),
  chairId: init.chair.id,
  rowIndex: init.chair.rowIndex,
  columnIndex: init.chair.columnIndex,
  side: init.chair.side,
  origin: { ...init.chair.position },
  position: { ...init.chair.position },
  waypoints: init.waypoints,
  waypointIndex: 0,
  state: "seated",
  releasedAt: null,
  exitedAt: null,
  speed: init.speed,
  width: init.width,
  depth: init.depth,
  blocked: false,
  color: init.color,
});
