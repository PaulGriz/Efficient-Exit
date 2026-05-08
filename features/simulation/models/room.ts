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
  /** Width of each wall exit opening (south/north span X; east/west span Z). */
  exitWidth: number;
  /** Depth of each exit strip along the inward normal from that wall. */
  exitDepth: number;
}

export interface RoomGeometry {
  /** Total interior width of the room (covers chairs + aisle + side exit strips). */
  width: number;
  /** Total interior depth (south exit strip + seating span + north exit strip). */
  depth: number;
  /** Z position of the front-most row of chairs. */
  frontRowZ: number;
  /** Z position of the back-most row of chairs. */
  backRowZ: number;
  /** South wall (-Z); final waypoints cross past this Z. */
  exitSouthZ: number;
  /** North wall (+Z). */
  exitNorthZ: number;
  /** West wall (-X). */
  exitWestX: number;
  /** East wall (+X). */
  exitEastX: number;
}

/**
 * Compute room geometry from configuration.
 *
 * The room is always centred on x = 0; the centre aisle runs along x = 0 from
 * the back of the room to the exits. Rows run along Z with symmetric south and
 * north exit strips; east and west strips widen the floor plan along X.
 */
export const computeRoomGeometry = (cfg: RoomConfig): RoomGeometry => {
  const halfChairsWidth =
    cfg.chairsPerHalfRow * cfg.chairWidth +
    Math.max(cfg.chairsPerHalfRow - 1, 0) * cfg.chairSpacing;
  const coreWidth = halfChairsWidth * 2 + cfg.aisleWidth;
  const width = coreWidth + 2 * cfg.exitDepth;

  const rowsSpan =
    cfg.rowCount * cfg.chairDepth +
    Math.max(cfg.rowCount - 1, 0) * cfg.rowSpacing;
  const depth = rowsSpan + 2 * cfg.exitDepth;

  const frontRowZ = -depth / 2 + cfg.exitDepth + cfg.chairDepth / 2;
  const backRowZ = frontRowZ + (cfg.rowCount - 1) * (cfg.chairDepth + cfg.rowSpacing);
  const exitSouthZ = -depth / 2;
  const exitNorthZ = depth / 2;
  const exitWestX = -width / 2;
  const exitEastX = width / 2;

  return {
    width,
    depth,
    frontRowZ,
    backRowZ,
    exitSouthZ,
    exitNorthZ,
    exitWestX,
    exitEastX,
  };
};
