"use client";

import { useFrame } from "@react-three/fiber";
import { useSimulationStore } from "../stores/useSimulationStore";

/** Maximum delta-time injected into the engine on a single frame, in seconds. */
const MAX_FRAME_DT = 1 / 30;

/**
 * Bridges React Three Fiber's per-frame callback to the engine's `tick`
 * action. Lives inside `<Canvas>` so we can read frame deltas and avoids
 * re-rendering the rest of the React tree at 60 Hz.
 */
export function SimulationLoop() {
  useFrame((_, delta) => {
    if (delta <= 0) return;
    const dt = Math.min(delta, MAX_FRAME_DT);
    useSimulationStore.getState().tick(dt);
  });
  return null;
}
