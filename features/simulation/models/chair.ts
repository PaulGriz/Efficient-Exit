import type { Vec2 } from "@/lib/math/aabb";
import type { RoomConfig, RoomGeometry } from "./room";

export type ChairSide = "left" | "right";

export interface Chair {
  id: string;
  rowIndex: number;
  /** Column index counted outward from the centre aisle (0 = closest to aisle). */
  columnIndex: number;
  side: ChairSide;
  position: Vec2;
  width: number;
  depth: number;
}

/**
 * Generate the full set of chairs for a configured room.
 *
 * Rows are indexed 0 .. rowCount - 1 from the front of the room (closest to
 * the exit) to the back. Within each row, columns are numbered outward from
 * the centre aisle on both halves; this makes "outside-in" / "inside-out"
 * algorithms trivial to express later on.
 */
export const generateChairs = (
  cfg: RoomConfig,
  geo: RoomGeometry,
): Chair[] => {
  const chairs: Chair[] = [];
  const halfAisle = cfg.aisleWidth / 2;
  const stride = cfg.chairWidth + cfg.chairSpacing;

  for (let row = 0; row < cfg.rowCount; row++) {
    const z = geo.frontRowZ + row * (cfg.chairDepth + cfg.rowSpacing);

    for (let col = 0; col < cfg.chairsPerHalfRow; col++) {
      const offset = halfAisle + cfg.chairWidth / 2 + col * stride;

      chairs.push({
        id: `chair-${row}-L-${col}`,
        rowIndex: row,
        columnIndex: col,
        side: "left",
        position: { x: -offset, z },
        width: cfg.chairWidth,
        depth: cfg.chairDepth,
      });

      chairs.push({
        id: `chair-${row}-R-${col}`,
        rowIndex: row,
        columnIndex: col,
        side: "right",
        position: { x: offset, z },
        width: cfg.chairWidth,
        depth: cfg.chairDepth,
      });
    }
  }

  return chairs;
};
