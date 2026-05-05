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
   * Display colour assigned at build time (cycled through red / green / yellow /
   * blue). CSS colour string (e.g. `hsl(...)`).
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

/** Fixed palette cycled by seat order so guests stay visually distinct. */
const PERSON_COLORS = [
  "hsl(0, 72%, 58%)", // red
  "hsl(142, 65%, 48%)", // green
  "hsl(48, 92%, 54%)", // yellow
  "hsl(217, 88%, 58%)", // blue
] as const;

export const createColorPalette = (count: number): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(PERSON_COLORS[i % PERSON_COLORS.length]!);
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
