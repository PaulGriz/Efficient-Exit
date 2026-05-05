import { distanceXZ, type Vec2 } from "@/lib/math/aabb";
import type { Algorithm } from "../models/algorithm";
import type { Chair } from "../models/chair";
import { generateChairs } from "../models/chair";
import {
  createColorPalette,
  createPerson,
  resetPersonIdCounter,
  type Person,
  type PersonState,
} from "../models/person";
import { computeRoomGeometry, type RoomConfig, type RoomGeometry } from "../models/room";
import { buildWaypoints } from "../pathing/waypointPlanner";
import { CollisionResolver } from "../collision/collisionResolver";

export interface SimulationConfig {
  peopleCount: number;
  personWidth: number;
  personDepth: number;
  personSpeed: number;
  collisionPadding: number;
  /** Minimum gap (in seconds) between two release ticks for an algorithm. */
  departureInterval: number;
  /** How many people the algorithm may release per release tick. */
  burstSize: number;
  /** Global animation speed multiplier (1 = real-time). */
  animationSpeed: number;
}

export type SimulationStatus = "idle" | "playing" | "paused" | "complete";

export interface BuildOptions {
  roomConfig: RoomConfig;
  simulationConfig: SimulationConfig;
}

export interface SimulationWorld {
  roomConfig: RoomConfig;
  simulationConfig: SimulationConfig;
  geometry: RoomGeometry;
  chairs: Chair[];
  people: Person[];
  resolver: CollisionResolver;
  /** Total elapsed simulation time in seconds. */
  elapsedTime: number;
  /** Time since the last release tick, in simulation seconds. */
  timeSinceLastRelease: number;
  status: SimulationStatus;
  /** When status transitions to `complete`, this captures the final time. */
  completionTime: number | null;
  /** Number of people currently colliding with at least one neighbour. */
  activeCollisions: number;
}

const buildPeople = (
  cfg: RoomConfig,
  geo: RoomGeometry,
  chairs: Chair[],
  sim: SimulationConfig,
): Person[] => {
  resetPersonIdCounter();
  const seated = chairs.slice(0, Math.min(sim.peopleCount, chairs.length));
  const palette = createColorPalette(seated.length);
  return seated.map((chair, index) =>
    createPerson({
      chair,
      width: sim.personWidth,
      depth: sim.personDepth,
      speed: sim.personSpeed,
      waypoints: buildWaypoints(chair, cfg, geo),
      color: palette[index]!,
    }),
  );
};

export const buildWorld = (options: BuildOptions): SimulationWorld => {
  const geometry = computeRoomGeometry(options.roomConfig);
  const chairs = generateChairs(options.roomConfig, geometry);
  const people = buildPeople(options.roomConfig, geometry, chairs, options.simulationConfig);

  const resolver = new CollisionResolver({
    collisionPadding: options.simulationConfig.collisionPadding,
    cellSize: Math.max(options.simulationConfig.personWidth * 2, 1),
  });

  return {
    roomConfig: options.roomConfig,
    simulationConfig: options.simulationConfig,
    geometry,
    chairs,
    people,
    resolver,
    elapsedTime: 0,
    timeSinceLastRelease: Number.POSITIVE_INFINITY,
    status: "idle",
    completionTime: null,
    activeCollisions: 0,
  };
};

const setPersonState = (person: Person, next: PersonState): void => {
  person.state = next;
};

const advanceWaypoint = (person: Person, target: Vec2): boolean => {
  const dist = distanceXZ(person.position, target);
  return dist < 0.05;
};

/**
 * Advance the world by `deltaTime` simulation seconds (already scaled by the
 * configured animation speed). The function mutates `world` in place; callers
 * are expected to clone-or-reassign references when they need React to detect
 * the change.
 */
export const stepWorld = (
  world: SimulationWorld,
  algorithm: Algorithm,
  deltaTime: number,
): void => {
  if (world.status !== "playing" || deltaTime <= 0) return;

  world.elapsedTime += deltaTime;
  world.timeSinceLastRelease += deltaTime;

  const ctx = {
    config: world.roomConfig,
    geometry: world.geometry,
    people: world.people,
    elapsedTime: world.elapsedTime,
  };

  if (world.timeSinceLastRelease >= world.simulationConfig.departureInterval) {
    const decision = algorithm.getNextDepartures(ctx);
    if (decision.releaseIds.length > 0) {
      for (const id of decision.releaseIds) {
        const person = world.people.find((p) => p.id === id);
        if (!person) continue;
        if (person.state !== "seated") continue;
        setPersonState(person, "standing");
        person.releasedAt = world.elapsedTime;
      }
      world.timeSinceLastRelease = 0;
    }
  }

  algorithm.update?.(ctx, deltaTime);

  world.resolver.rebuild(world.people, world.chairs);

  let activeCollisions = 0;

  for (const person of world.people) {
    if (person.state === "seated" || person.state === "exited") continue;

    if (person.state === "standing") {
      setPersonState(person, "moving");
    }

    const target = person.waypoints[person.waypointIndex];
    if (!target) {
      setPersonState(person, "exited");
      person.exitedAt = world.elapsedTime;
      continue;
    }

    const maxStep = person.speed * deltaTime;
    const move = world.resolver.tryMove(person, target, maxStep);
    person.position = move.position;
    person.blocked = move.blocked;

    if (move.blocked) {
      activeCollisions += 1;
      setPersonState(person, "waiting");
    } else {
      setPersonState(person, "moving");
      // Commit the new position to the grid so subsequent persons in this
      // tick collide against the up-to-date layout.
      world.resolver.commitMove(person);
    }

    if (advanceWaypoint(person, target)) {
      person.waypointIndex += 1;
      if (person.waypointIndex >= person.waypoints.length) {
        setPersonState(person, "exited");
        person.exitedAt = world.elapsedTime;
        world.resolver.commitMove(person);
      }
    }
  }

  world.activeCollisions = activeCollisions;

  const allExited = world.people.every((p) => p.state === "exited");
  if (allExited && world.people.length > 0) {
    world.status = "complete";
    world.completionTime = world.elapsedTime;
  }
};

export interface DerivedStats {
  exitedCount: number;
  remainingCount: number;
  averageExitTime: number;
  activeCollisions: number;
}

export const deriveStats = (world: SimulationWorld): DerivedStats => {
  let exitedCount = 0;
  let totalExitTime = 0;
  for (const p of world.people) {
    if (p.state === "exited" && p.exitedAt !== null) {
      exitedCount += 1;
      totalExitTime += p.exitedAt;
    }
  }
  return {
    exitedCount,
    remainingCount: world.people.length - exitedCount,
    averageExitTime: exitedCount > 0 ? totalExitTime / exitedCount : 0,
    activeCollisions: world.activeCollisions,
  };
};
