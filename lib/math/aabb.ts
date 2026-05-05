/**
 * 2D axis-aligned bounding box helpers used for top-down collision checks.
 *
 * The simulation is functionally 2D (we only collide on the X/Z plane) so
 * using a flat AABB is much cheaper than dragging Three.js `Box3` objects
 * through every per-frame collision query. We can still feed these values
 * into `Box3` for visualisation when debug mode is enabled.
 */

export interface Vec2 {
  x: number;
  z: number;
}

export interface AABB {
  /** Minimum corner (inclusive). */
  minX: number;
  minZ: number;
  /** Maximum corner (inclusive). */
  maxX: number;
  maxZ: number;
}

export const aabbFromCenter = (
  cx: number,
  cz: number,
  width: number,
  depth: number,
  padding = 0,
): AABB => {
  const halfW = width / 2 + padding;
  const halfD = depth / 2 + padding;
  return {
    minX: cx - halfW,
    minZ: cz - halfD,
    maxX: cx + halfW,
    maxZ: cz + halfD,
  };
};

/**
 * Tolerance used when deciding whether two AABBs overlap. Anything below
 * this is treated as "touching" rather than "intersecting", which lets
 * two padded boxes that just kiss along an edge slide past each other
 * instead of locking up in a perpendicular-path deadlock.
 */
export const AABB_OVERLAP_EPSILON = 1e-6;

export const aabbIntersects = (a: AABB, b: AABB): boolean =>
  a.minX < b.maxX - AABB_OVERLAP_EPSILON &&
  a.maxX > b.minX + AABB_OVERLAP_EPSILON &&
  a.minZ < b.maxZ - AABB_OVERLAP_EPSILON &&
  a.maxZ > b.minZ + AABB_OVERLAP_EPSILON;

export const aabbContainsPoint = (a: AABB, x: number, z: number): boolean =>
  x >= a.minX && x <= a.maxX && z >= a.minZ && z <= a.maxZ;

export const aabbCenter = (a: AABB): Vec2 => ({
  x: (a.minX + a.maxX) / 2,
  z: (a.minZ + a.maxZ) / 2,
});

export const aabbSize = (a: AABB): { width: number; depth: number } => ({
  width: a.maxX - a.minX,
  depth: a.maxZ - a.minZ,
});

export const distanceXZ = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
};

export const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
