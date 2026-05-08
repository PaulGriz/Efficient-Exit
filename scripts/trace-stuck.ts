/**
 * Run a single tick of the simulation and dump the proposed-move outcome
 * for every non-exited person, including which entities (if any) blocked
 * them. Used to debug why people aren't advancing.
 */
import { SIM_DEFAULTS } from "@/lib/constants/simulation";
import { aabbFromCenter, type AABB } from "@/lib/math/aabb";
import { createAlgorithm } from "@/features/simulation/algorithms/registry";
import {
  buildWorld,
  stepWorld,
  type SimulationConfig,
} from "@/features/simulation/engine/simulationEngine";
import type { RoomConfig } from "@/features/simulation/models/room";

const roomConfig: RoomConfig = {
  rowCount: SIM_DEFAULTS.rowCount,
  chairsPerHalfRow: SIM_DEFAULTS.chairsPerHalfRow,
  chairWidth: SIM_DEFAULTS.chairWidth,
  chairDepth: SIM_DEFAULTS.chairDepth,
  chairSpacing: SIM_DEFAULTS.chairSpacing,
  rowSpacing: SIM_DEFAULTS.rowSpacing,
  aisleWidth: SIM_DEFAULTS.aisleWidth,
  exitWidth: SIM_DEFAULTS.exitWidth,
  exitDepth: SIM_DEFAULTS.exitDepth,
};

const simulationConfig: SimulationConfig = {
  peopleCount: SIM_DEFAULTS.rowCount * SIM_DEFAULTS.chairsPerHalfRow * 2,
  personWidth: SIM_DEFAULTS.personWidth,
  personDepth: SIM_DEFAULTS.personDepth,
  personSpeed: SIM_DEFAULTS.personSpeed,
  collisionPadding: SIM_DEFAULTS.collisionPadding,
  departureInterval: SIM_DEFAULTS.departureInterval,
  burstSize: SIM_DEFAULTS.burstSize,
  animationSpeed: SIM_DEFAULTS.animationSpeed,
  activeExitDirections: SIM_DEFAULTS.activeExitDirections,
};

const world = buildWorld({ roomConfig, simulationConfig });
const algorithm = createAlgorithm("front-to-back", simulationConfig.burstSize);
algorithm.initialize({
  config: world.roomConfig,
  geometry: world.geometry,
  people: world.people,
  elapsedTime: 0,
});
world.status = "playing";

// Run forward to a point where we expect deadlock to be visible.
const DT = 1 / 60;
const TARGET_SEC = Number(process.argv[2] ?? "20");
for (let t = 0; t < TARGET_SEC / DT; t++) {
  stepWorld(world, algorithm, DT);
}

console.log(`After ${world.elapsedTime.toFixed(2)}s: status=${world.status}`);
console.log("People focused on row 0/1:");

const interesting = world.people.filter(
  (p) => p.rowIndex < 3 && p.state !== "exited" && p.state !== "seated",
);

for (const p of interesting.slice(0, 16)) {
  const target = p.waypoints[p.waypointIndex];
  if (!target) continue;
  const dx = target.x - p.position.x;
  const dz = target.z - p.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.001) continue;

  const ux = dx / dist;
  const uz = dz / dist;
  const step = Math.min(p.speed * DT, dist);
  const proposed = {
    x: p.position.x + ux * step,
    z: p.position.z + uz * step,
  };

  const proposedBounds: AABB = aabbFromCenter(
    proposed.x,
    proposed.z,
    p.width,
    p.depth,
    simulationConfig.collisionPadding,
  );

  const blockers = world.resolver.query(proposedBounds, p.id).filter((hit) => {
    if (hit.payload.kind === "person")
      return hit.payload.person.state !== "exited";
    if (hit.payload.kind === "chair") return hit.id !== p.chairId;
    return true;
  });

  console.log(
    `  ${p.id.padStart(9)} r${p.rowIndex}c${p.columnIndex}${p.side[0]} ` +
      `state=${p.state.padEnd(8)} wp=${p.waypointIndex} ` +
      `at=(${p.position.x.toFixed(5)},${p.position.z.toFixed(5)}) ` +
      `target=(${target.x},${target.z}) ` +
      `proposed=(${proposed.x.toFixed(5)},${proposed.z.toFixed(5)}) ` +
      `bounds=[${proposedBounds.minX.toFixed(5)},${proposedBounds.minZ.toFixed(5)} -> ${proposedBounds.maxX.toFixed(5)},${proposedBounds.maxZ.toFixed(5)}] ` +
      `blockers=${blockers.length}`,
  );
  for (const b of blockers.slice(0, 3)) {
    if (b.payload.kind === "person") {
      const op = b.payload.person;
      console.log(
        `      <- person ${op.id} ` +
          `at=(${op.position.x.toFixed(5)},${op.position.z.toFixed(5)}) ` +
          `bounds=[${b.bounds.minX.toFixed(5)},${b.bounds.minZ.toFixed(5)} -> ${b.bounds.maxX.toFixed(5)},${b.bounds.maxZ.toFixed(5)}] ` +
          `state=${op.state}`,
      );
    } else if (b.payload.kind === "chair") {
      console.log(`      <- chair ${b.id}`);
    }
  }
}
