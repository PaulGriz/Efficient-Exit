import type { Vec2 } from "@/lib/math/aabb";
import type { Chair } from "../models/chair";
import type { RoomConfig, RoomGeometry } from "../models/room";

/**
 * Build the waypoint sequence a person must follow to exit the room.
 *
 * The first hop steps the person *backward out of their seat* (in +z) into
 * the row gap immediately behind their chair. From there they sidestep to
 * a side-specific lane in the centre aisle (left side -> negative x, right
 * side -> positive x) and walk down their lane all the way through the
 * exit. Keeping the two sides on parallel lanes is what prevents the two
 * halves of every row from deadlocking on the centre line.
 */
export const buildWaypoints = (
  chair: Chair,
  cfg: RoomConfig,
  geo: RoomGeometry,
): Vec2[] => {
  // Each side gets a lane offset half-way between the centre and the
  // chairs. With the default 1.4 m aisle that leaves 0.7 m of separation
  // between the two lanes, comfortably more than the ~0.55 m a padded
  // person needs.
  const laneX =
    chair.side === "left" ? -cfg.aisleWidth / 4 : cfg.aisleWidth / 4;
  // Halfway between this chair's back face and the next row's front face
  // (or, for the last row, well inside the back-wall margin).
  const rowGapZ = chair.position.z + cfg.chairDepth / 2 + cfg.rowSpacing / 2;

  return [
    { x: chair.position.x, z: rowGapZ },
    { x: laneX, z: rowGapZ },
    { x: laneX, z: geo.exitZ + cfg.exitDepth * 0.4 },
    { x: laneX, z: geo.exitZ - cfg.exitDepth * 0.5 },
  ];
};
