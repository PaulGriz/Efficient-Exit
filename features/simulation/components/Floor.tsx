"use client";

import { FLOOR_Y } from "@/lib/constants/simulation";
import type { RoomGeometry } from "../models/room";

interface FloorProps {
  geometry: RoomGeometry;
}

export function Floor({ geometry }: FloorProps) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}>
      <planeGeometry args={[geometry.width + 4, geometry.depth + 4]} />
      <meshLambertMaterial color="#1c2533" />
    </mesh>
  );
}
