import type { Vec2 } from "@/lib/math/aabb";

export interface RoomConfig {
  rowCount: number;
  /** Number of chairs in a single row half (so total per row is 2x this). */
  chairsPerHalfRow: number;
  chairWidth: number;
  chairDepth: number;
  /** Horizontal gap between adjacent chairs in the same row. */
  chairSpacing: number;
  /** Front-to-back gap between adjacent rows. */
  rowSpacing: number;
  /** Width of the centre aisle separating the two halves of every row. */
  aisleWidth: number;
  /** Width of the exit opening at the front of the room. */
  exitWidth: number;
  /** Depth of the exit zone in front of the front row. */
  exitDepth: number;
}

export interface RoomGeometry {
  /** Total interior width of the room (covers chairs + aisle + side margins). */
  width: number;
  /** Total interior depth of the room (front row to back row plus exit area). */
  depth: number;
  /** Z position of the front-most row of chairs. */
  frontRowZ: number;
  /** Z position of the back-most row of chairs. */
  backRowZ: number;
  /** Z of the exit threshold (where people are considered exited). */
  exitZ: number;
  /** Centre point of the exit, used as the final waypoint target. */
  exitCenter: Vec2;
}

/**
 * Compute room geometry from configuration.
 *
 * The room is always centred on x = 0; the centre aisle runs along x = 0 from
 * the back of the room to the exit. Rows are laid out front-to-back along the
 * z axis with the exit at the front (smallest z).
 */
export const computeRoomGeometry = (cfg: RoomConfig): RoomGeometry => {
  const halfChairsWidth =
    cfg.chairsPerHalfRow * cfg.chairWidth +
    Math.max(cfg.chairsPerHalfRow - 1, 0) * cfg.chairSpacing;
  const width = halfChairsWidth * 2 + cfg.aisleWidth + 2 * 1; // 1m wall margin

  const rowsSpan =
    cfg.rowCount * cfg.chairDepth +
    Math.max(cfg.rowCount - 1, 0) * cfg.rowSpacing;
  const depth = rowsSpan + cfg.exitDepth + 1; // 1m back-wall margin

  const frontRowZ = -depth / 2 + cfg.exitDepth + cfg.chairDepth / 2;
  const backRowZ = frontRowZ + (cfg.rowCount - 1) * (cfg.chairDepth + cfg.rowSpacing);
  const exitZ = -depth / 2;

  return {
    width,
    depth,
    frontRowZ,
    backRowZ,
    exitZ,
    exitCenter: { x: 0, z: exitZ },
  };
};
