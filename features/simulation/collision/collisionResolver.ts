import { aabbFromCenter, type AABB, type Vec2 } from "@/lib/math/aabb";
import type { Chair } from "../models/chair";
import type { Person } from "../models/person";
import type { RoomConfig, RoomGeometry } from "../models/room";
import {
  clampActiveExitDirections,
  exitsForDirectionCount,
  type ActiveExitDirections,
} from "../pathing/waypointPlanner";
import { SpatialGrid, type GridEntry } from "./spatialGrid";

/**
 * "Penetration" of `a` into `b` along each axis: 0 means the bounds don't
 * intersect on that axis, otherwise the size of the overlap on that axis.
 * Used by the yield rule to decide whether a proposed move worsens an
 * already-overlapping pair.
 */
const overlapAmount = (a: AABB, b: AABB): { x: number; z: number } => {
  const x = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const z = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
  return { x: Math.max(x, 0), z: Math.max(z, 0) };
};

/**
 * A move is "worse than current" if it increases the overlap with any of the
 * blockers we already overlap with. We treat a strictly-larger overlap on
 * either axis as worse, since two padded AABBs that overlap on both axes
 * would represent contact in 2D.
 */
const moveIsWorse = (
  currentBounds: AABB,
  proposedBounds: AABB,
  hits: GridEntry<unknown>[],
): boolean => {
  for (const hit of hits) {
    const before = overlapAmount(currentBounds, hit.bounds);
    const after = overlapAmount(proposedBounds, hit.bounds);
    if (after.x > before.x + 1e-9 || after.z > before.z + 1e-9) {
      return true;
    }
  }
  return false;
};

export type StaticEntity =
  | { kind: "chair"; chair: Chair }
  | { kind: "wall" };

export type DynamicEntity = { kind: "person"; person: Person };

export interface CollisionResolverOptions {
  collisionPadding: number;
  cellSize: number;
}

export interface ResolvedMove {
  /** Final position after resolution (may equal current position if blocked). */
  position: Vec2;
  /** Whether the proposed move was blocked by another moving body. */
  blocked: boolean;
  /** AABB at the resolved position, useful for debug rendering. */
  bounds: AABB;
}

const buildPersonAabb = (
  person: Person,
  position: Vec2,
  padding: number,
): AABB => aabbFromCenter(position.x, position.z, person.width, person.depth, padding);

const buildChairAabb = (chair: Chair, padding: number): AABB =>
  aabbFromCenter(
    chair.position.x,
    chair.position.z,
    chair.width,
    chair.depth,
    padding,
  );

const WALL_THICKNESS = 0.2;

const makeHorizontalWall = (
  id: string,
  z: number,
  x0: number,
  x1: number,
): GridEntry<StaticEntity> | null => {
  const width = Math.abs(x1 - x0);
  if (width <= 1e-6) return null;
  return {
    id,
    bounds: aabbFromCenter((x0 + x1) / 2, z, width, WALL_THICKNESS, 0),
    payload: { kind: "wall" },
  };
};

const makeVerticalWall = (
  id: string,
  x: number,
  z0: number,
  z1: number,
): GridEntry<StaticEntity> | null => {
  const depth = Math.abs(z1 - z0);
  if (depth <= 1e-6) return null;
  return {
    id,
    bounds: aabbFromCenter(x, (z0 + z1) / 2, WALL_THICKNESS, depth, 0),
    payload: { kind: "wall" },
  };
};

const buildWallEntries = (
  cfg: RoomConfig,
  geo: RoomGeometry,
  activeDirections: ActiveExitDirections,
): GridEntry<StaticEntity>[] => {
  const enabled = exitsForDirectionCount(
    clampActiveExitDirections(activeDirections),
  );
  const halfW = geo.width / 2;
  const halfD = geo.depth / 2;
  const openHalf = cfg.exitWidth / 2;
  const walls: GridEntry<StaticEntity>[] = [];

  // South wall (-Z)
  if (enabled.includes("south")) {
    const left = makeHorizontalWall(
      "wall-south-left",
      geo.exitSouthZ,
      -halfW,
      -openHalf,
    );
    const right = makeHorizontalWall(
      "wall-south-right",
      geo.exitSouthZ,
      openHalf,
      halfW,
    );
    if (left) walls.push(left);
    if (right) walls.push(right);
  } else {
    const full = makeHorizontalWall("wall-south", geo.exitSouthZ, -halfW, halfW);
    if (full) walls.push(full);
  }

  // North wall (+Z)
  if (enabled.includes("north")) {
    const left = makeHorizontalWall(
      "wall-north-left",
      geo.exitNorthZ,
      -halfW,
      -openHalf,
    );
    const right = makeHorizontalWall(
      "wall-north-right",
      geo.exitNorthZ,
      openHalf,
      halfW,
    );
    if (left) walls.push(left);
    if (right) walls.push(right);
  } else {
    const full = makeHorizontalWall("wall-north", geo.exitNorthZ, -halfW, halfW);
    if (full) walls.push(full);
  }

  // West wall (-X)
  if (enabled.includes("west")) {
    const top = makeVerticalWall(
      "wall-west-top",
      geo.exitWestX,
      openHalf,
      halfD,
    );
    const bottom = makeVerticalWall(
      "wall-west-bottom",
      geo.exitWestX,
      -halfD,
      -openHalf,
    );
    if (top) walls.push(top);
    if (bottom) walls.push(bottom);
  } else {
    const full = makeVerticalWall("wall-west", geo.exitWestX, -halfD, halfD);
    if (full) walls.push(full);
  }

  // East wall (+X)
  if (enabled.includes("east")) {
    const top = makeVerticalWall(
      "wall-east-top",
      geo.exitEastX,
      openHalf,
      halfD,
    );
    const bottom = makeVerticalWall(
      "wall-east-bottom",
      geo.exitEastX,
      -halfD,
      -openHalf,
    );
    if (top) walls.push(top);
    if (bottom) walls.push(bottom);
  } else {
    const full = makeVerticalWall("wall-east", geo.exitEastX, -halfD, halfD);
    if (full) walls.push(full);
  }

  return walls;
};

/**
 * Resolve broad-phase + narrow-phase collisions for the moving population.
 *
 * The resolver is intentionally simple: it tries the full proposed move
 * first, and on collision falls back to a series of progressively shorter
 * moves toward the target. If none succeed the person is marked as blocked
 * and stays in place this tick. This produces the "queueing" behaviour
 * needed for the bottleneck at the exit without any dedicated queueing code.
 */
export class CollisionResolver {
  private readonly options: CollisionResolverOptions;
  private readonly grid: SpatialGrid<DynamicEntity | StaticEntity>;

  constructor(options: CollisionResolverOptions) {
    this.options = options;
    this.grid = new SpatialGrid(options.cellSize);
  }

  rebuild(
    people: Person[],
    chairs: Chair[],
    roomConfig: RoomConfig,
    geometry: RoomGeometry,
    activeExitDirections: ActiveExitDirections,
  ): void {
    this.grid.clear();

    for (const person of people) {
      if (person.state === "exited") continue;
      this.grid.insert({
        id: person.id,
        bounds: buildPersonAabb(person, person.position, 0),
        payload: { kind: "person", person },
      });
    }

    for (const chair of chairs) {
      this.grid.insert({
        id: chair.id,
        bounds: buildChairAabb(chair, 0),
        payload: { kind: "chair", chair },
      });
    }

    for (const wall of buildWallEntries(
      roomConfig,
      geometry,
      activeExitDirections,
    )) {
      this.grid.insert(wall);
    }
  }

  /**
   * Try to move `person` from its current position toward `target` by at most
   * `maxStep` metres. Performs a small bisection sweep along the move axis
   * if the full step collides.
   *
   * The person's own chair is always excluded from collision checks: every
   * person starts seated *on* their chair, so without the exclusion their
   * very first move would be blocked by it forever.
   *
   * The resolver also implements a "no worse than current" yield rule: if
   * the person is already overlapping a blocker (e.g. because two queue
   * members ended up tighter than their padded threshold) the move is still
   * accepted as long as it doesn't *increase* the overlap with that
   * blocker. Without this, two perpendicular paths can meet just inside the
   * padded clearance and then deadlock forever, since any motion would
   * worsen the padded intersection.
   */
  tryMove(person: Person, target: Vec2, maxStep: number): ResolvedMove {
    const current = person.position;
    const dx = target.x - current.x;
    const dz = target.z - current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= 1e-6) {
      const bounds = buildPersonAabb(person, current, 0);
      return { position: current, blocked: false, bounds };
    }

    const padding = this.options.collisionPadding;
    const currentPadded = buildPersonAabb(person, current, padding);
    const currentHits = this.queryBlockers(person, currentPadded);

    const stepDist = Math.min(maxStep, dist);
    const ux = dx / dist;
    const uz = dz / dist;

    /**
     * For each fraction of `stepDist` we try the full diagonal first, and
     * if that's blocked we try an axis-aligned slide along x only and along
     * z only. This gives the "slide along the obstacle" behaviour you'd
     * expect when a person walking diagonally bumps into a queue mate from
     * the side: they continue along the unblocked axis.
     */
    type Move = { x: number; z: number };
    const candidates = (s: number): Move[] => [
      { x: ux * s, z: uz * s },
      { x: ux * s, z: 0 },
      { x: 0, z: uz * s },
    ];

    const tryMoveCandidate = (move: Move): ResolvedMove | null => {
      if (move.x === 0 && move.z === 0) return null;
      const proposedX = current.x + move.x;
      const proposedZ = current.z + move.z;
      const proposedBounds = buildPersonAabb(
        person,
        { x: proposedX, z: proposedZ },
        padding,
      );
      const proposedHits = this.queryBlockers(person, proposedBounds);

      if (proposedHits.length === 0) {
        return {
          position: { x: proposedX, z: proposedZ },
          blocked: false,
          bounds: buildPersonAabb(person, { x: proposedX, z: proposedZ }, 0),
        };
      }

      // The proposed position overlaps someone's padded box. Allow the
      // move only if we already overlap that body and the move doesn't
      // worsen the overlap (yield rule).
      if (
        currentHits.length > 0 &&
        !moveIsWorse(currentPadded, proposedBounds, proposedHits)
      ) {
        return {
          position: { x: proposedX, z: proposedZ },
          blocked: false,
          bounds: buildPersonAabb(person, { x: proposedX, z: proposedZ }, 0),
        };
      }

      return null;
    };

    const fractions = [1, 0.5, 0.25];
    for (const f of fractions) {
      const s = stepDist * f;
      for (const candidate of candidates(s)) {
        const result = tryMoveCandidate(candidate);
        if (result) return result;
      }
    }

    return {
      position: current,
      blocked: true,
      bounds: buildPersonAabb(person, current, 0),
    };
  }

  /**
   * Update the grid entry for `person` to reflect their current position.
   * Call this after the engine has committed a successful move so that any
   * other person processed later in the same tick sees the latest position
   * — that's what makes the "first one through queues the second one"
   * yielding behaviour work.
   */
  commitMove(person: Person): void {
    if (person.state === "exited") {
      this.grid.remove(person.id);
      return;
    }
    this.grid.update({
      id: person.id,
      bounds: buildPersonAabb(person, person.position, 0),
      payload: { kind: "person", person },
    });
  }

  /**
   * Public accessor used by debug renderers to draw all bounds the resolver
   * is currently tracking.
   */
  query(bounds: AABB, excludeId?: string): GridEntry<DynamicEntity | StaticEntity>[] {
    return this.grid.query(bounds, excludeId);
  }

  /**
   * Return the entries that would block `person` if their AABB occupied
   * `bounds` — i.e. excluding the person themselves, their own chair,
   * and any already-exited people.
   */
  private queryBlockers(
    person: Person,
    bounds: AABB,
  ): GridEntry<DynamicEntity | StaticEntity>[] {
    const raw = this.grid.query(bounds, person.id);
    const blockers: GridEntry<DynamicEntity | StaticEntity>[] = [];
    for (const hit of raw) {
      if (hit.payload.kind === "person") {
        if (hit.payload.person.state === "exited") continue;
      } else if (hit.payload.kind === "chair") {
        if (hit.id === person.chairId) continue;
      }
      blockers.push(hit);
    }
    return blockers;
  }
}
