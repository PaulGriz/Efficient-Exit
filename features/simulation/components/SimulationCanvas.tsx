"use client";

import { Canvas } from "@react-three/fiber";
import { useSimulationStore } from "../stores/useSimulationStore";
import { RoomScene } from "./RoomScene";

export function SimulationCanvas() {
  const worldVersion = useSimulationStore((state) => state.worldVersion);

  return (
    <Canvas
      // `flat` disables ACES tone mapping. We're an SDR top-down scene; the
      // default film-emulation tone mapping crushes our diffuse colours and
      // makes everything look near-black.
      flat
      gl={{ antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
      style={{ background: "#0b1220" }}
      aria-label="Overhead view of the wedding seating layout, with people moving toward the nearest wall exit."
      role="img"
    >
      <RoomScene worldVersion={worldVersion} />
    </Canvas>
  );
}
