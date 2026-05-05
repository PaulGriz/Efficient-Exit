/**
 * Headless smoke test of the simulation engine. Run with `bun scripts/smoke-engine.ts`.
 *
 * Verifies that:
 *   1. People actually leave their seats once the world is set to "playing".
 *   2. Every algorithm reaches the `complete` status within a generous time
 *      budget for the default room geometry.
 */
import { SIM_DEFAULTS } from "@/lib/constants/simulation";
import {
  ALGORITHMS,
  createAlgorithm,
} from "@/features/simulation/algorithms/registry";
import {
  buildWorld,
  stepWorld,
  deriveStats,
  type SimulationConfig,
  type SimulationStatus,
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
};

const DT = 1 / 60;
const MAX_SECONDS = 240;

let exitCode = 0;

for (const descriptor of ALGORITHMS) {
  const world = buildWorld({ roomConfig, simulationConfig });
  const algorithm = createAlgorithm(descriptor.id, simulationConfig.burstSize);
  algorithm.initialize({
    config: world.roomConfig,
    geometry: world.geometry,
    people: world.people,
    elapsedTime: 0,
  });
  world.status = "playing";

  const seatPositions = new Map(
    world.people.map((p) => [p.id, { ...p.position }]),
  );

  let totalSteps = 0;
  while (world.status === "playing" && world.elapsedTime < MAX_SECONDS) {
    stepWorld(world, algorithm, DT);
    totalSteps += 1;
  }

  const stats = deriveStats(world);
  const movedCount = world.people.reduce((acc, p) => {
    const start = seatPositions.get(p.id)!;
    const dx = p.position.x - start.x;
    const dz = p.position.z - start.z;
    return acc + (Math.sqrt(dx * dx + dz * dz) > 0.5 ? 1 : 0);
  }, 0);

  const finalStatus: SimulationStatus = world.status;
  const ok =
    finalStatus === "complete" &&
    stats.exitedCount === world.people.length &&
    movedCount === world.people.length;

  console.log(
    `${ok ? "PASS" : "FAIL"} | ${descriptor.id.padEnd(14)} | ` +
      `status=${world.status.padEnd(8)} | ` +
      `t=${world.elapsedTime.toFixed(2).padStart(7)}s | ` +
      `exited=${stats.exitedCount}/${world.people.length} | ` +
      `moved=${movedCount} | ` +
      `steps=${totalSteps}`,
  );

  if (!ok) {
    exitCode = 1;
    const stuck = world.people.filter((p) => p.state !== "exited");
    const sample = stuck.slice(0, 8);
    for (const p of sample) {
      const start = seatPositions.get(p.id)!;
      const target = p.waypoints[p.waypointIndex];
      const targetStr = target
        ? `target=(${target.x.toFixed(2)},${target.z.toFixed(2)})`
        : "target=<none>";

      let nearest: { other: typeof p; dist: number } | null = null;
      for (const other of world.people) {
        if (other.id === p.id) continue;
        if (other.state === "exited") continue;
        const dx = other.position.x - p.position.x;
        const dz = other.position.z - p.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (!nearest || d < nearest.dist) nearest = { other, dist: d };
      }

      console.log(
        `   - ${p.id} state=${p.state.padEnd(8)} ` +
          `wp=${p.waypointIndex}/${p.waypoints.length} ` +
          `now=(${p.position.x.toFixed(2)},${p.position.z.toFixed(2)}) ` +
          `${targetStr} ` +
          `start=(${start.x.toFixed(2)},${start.z.toFixed(2)}) ` +
          `released=${p.releasedAt?.toFixed(1) ?? "—"}s`,
      );
      if (nearest) {
        const n = nearest.other;
        console.log(
          `       nearest: ${n.id} state=${n.state.padEnd(8)} ` +
            `at=(${n.position.x.toFixed(2)},${n.position.z.toFixed(2)}) ` +
            `wp=${n.waypointIndex}/${n.waypoints.length} ` +
            `dist=${nearest.dist.toFixed(3)}m`,
        );
      }
    }

    const wpHistogram = new Map<string, number>();
    for (const p of stuck) {
      const k = `${p.state}@wp${p.waypointIndex}`;
      wpHistogram.set(k, (wpHistogram.get(k) ?? 0) + 1);
    }
    const sorted = [...wpHistogram.entries()].sort((a, b) => b[1] - a[1]);
    console.log(
      `       histogram (state@waypoint): ${sorted.map(([k, v]) => `${k}=${v}`).join(", ")}`,
    );
  }
}

process.exit(exitCode);
