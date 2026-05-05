"use client";

import type { RoomGeometry } from "../models/room";
import type { RoomConfig } from "../models/room";

interface ExitZoneProps {
  geometry: RoomGeometry;
  config: RoomConfig;
}

/**
 * Visual marker for the exit threshold. The simulation engine treats anyone
 * past the third waypoint as exited, so this is purely cosmetic.
 */
export function ExitZone({ geometry, config }: ExitZoneProps) {
  const z = geometry.exitZ + config.exitDepth / 4;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]}>
        <planeGeometry args={[config.exitWidth, config.exitDepth * 0.6]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.18} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, geometry.exitZ + 0.05]}
      >
        <planeGeometry args={[config.exitWidth, 0.08]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
    </group>
  );
}
