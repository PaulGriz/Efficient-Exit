"use client";

import type { RoomGeometry } from "../models/room";
import type { RoomConfig } from "../models/room";
import {
  clampActiveExitDirections,
  type ActiveExitDirections,
} from "../pathing/waypointPlanner";

interface ExitZoneProps {
  geometry: RoomGeometry;
  config: RoomConfig;
  /** Which exits exist for this run (1–4 → south through west). */
  activeDirections: ActiveExitDirections;
}

/**
 * Visual markers for each active wall exit. Waypoints extend slightly past wall
 * planes so exited people disappear from collision; this overlay is cosmetic.
 */
export function ExitZone({
  geometry,
  config,
  activeDirections,
}: ExitZoneProps) {
  const n = clampActiveExitDirections(activeDirections);
  const showSouth = n >= 1;
  const showNorth = n >= 2;
  const showEast = n >= 3;
  const showWest = n >= 4;

  const southZ = geometry.exitSouthZ + config.exitDepth / 4;
  const northZ = geometry.exitNorthZ - config.exitDepth / 4;
  const westX = geometry.exitWestX + config.exitDepth / 4;
  const eastX = geometry.exitEastX - config.exitDepth / 4;
  const w = config.exitWidth;
  const d = config.exitDepth * 0.6;

  return (
    <group>
      {showSouth ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, southZ]}>
            <planeGeometry args={[w, d]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.18} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.02, geometry.exitSouthZ + 0.05]}
          >
            <planeGeometry args={[w, 0.08]} />
            <meshBasicMaterial color="#22d3ee" />
          </mesh>
        </>
      ) : null}

      {showNorth ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, northZ]}>
            <planeGeometry args={[w, d]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.18} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.02, geometry.exitNorthZ - 0.05]}
          >
            <planeGeometry args={[w, 0.08]} />
            <meshBasicMaterial color="#22d3ee" />
          </mesh>
        </>
      ) : null}

      {showEast ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[eastX, 0.01, 0]}>
            <planeGeometry args={[d, w]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.18} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
            position={[geometry.exitEastX - 0.05, 0.02, 0]}
          >
            <planeGeometry args={[w, 0.08]} />
            <meshBasicMaterial color="#22d3ee" />
          </mesh>
        </>
      ) : null}

      {showWest ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[westX, 0.01, 0]}>
            <planeGeometry args={[d, w]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.18} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
            position={[geometry.exitWestX + 0.05, 0.02, 0]}
          >
            <planeGeometry args={[w, 0.08]} />
            <meshBasicMaterial color="#22d3ee" />
          </mesh>
        </>
      ) : null}
    </group>
  );
}
