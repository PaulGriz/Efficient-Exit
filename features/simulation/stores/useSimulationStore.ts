"use client";

import { create } from "zustand";
import {
  DEFAULT_ALGORITHM_ID,
  type AlgorithmId,
} from "@/lib/constants/simulation";
import type { Algorithm } from "../models/algorithm";
import {
  buildWorld,
  deriveStats,
  stepWorld,
  type SimulationStatus,
  type SimulationWorld,
} from "../engine/simulationEngine";
import { ALGORITHM_INDEX, createAlgorithm } from "../algorithms/registry";
import { useConfigStore } from "./useConfigStore";

/**
 * Reactive surface for the simulation engine.
 *
 * The mutable {@link SimulationWorld} reference and the {@link Algorithm}
 * instance live on this store but are *not* themselves reactive: per-frame
 * mesh updates read them via `getState()` to avoid spamming React with
 * re-renders on every tick. Only summary fields (status, elapsedTime,
 * counts) trigger subscribers.
 */
export interface SimulationState {
  /** Mutable engine world. Null until the first build. */
  world: SimulationWorld | null;
  /** Active algorithm instance. */
  algorithm: Algorithm;
  selectedAlgorithmId: AlgorithmId;

  status: SimulationStatus;
  elapsedTime: number;
  completionTime: number | null;
  exitedCount: number;
  remainingCount: number;
  averageExitTime: number;
  activeCollisions: number;

  /** Bumps every time the world is rebuilt so subscribers can reset caches. */
  worldVersion: number;

  build: () => void;
  reset: () => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  step: (deltaTime: number) => void;
  tick: (deltaTime: number) => void;
  setAlgorithm: (id: AlgorithmId) => void;
}

const buildAlgorithmFor = (id: AlgorithmId): Algorithm => {
  const config = useConfigStore.getState().simulationConfig;
  return createAlgorithm(id, config.burstSize);
};

const buildWorldFromConfig = (algorithm: Algorithm): SimulationWorld => {
  const { roomConfig, simulationConfig } = useConfigStore.getState();
  const world = buildWorld({ roomConfig, simulationConfig });
  algorithm.reset?.();
  algorithm.initialize({
    config: world.roomConfig,
    geometry: world.geometry,
    people: world.people,
    elapsedTime: 0,
  });
  return world;
};

const snapshotStats = (world: SimulationWorld) => {
  const stats = deriveStats(world);
  return {
    status: world.status,
    elapsedTime: world.elapsedTime,
    completionTime: world.completionTime,
    exitedCount: stats.exitedCount,
    remainingCount: stats.remainingCount,
    averageExitTime: stats.averageExitTime,
    activeCollisions: stats.activeCollisions,
  };
};

export const useSimulationStore = create<SimulationState>((set, get) => {
  const initialAlgorithm = buildAlgorithmFor(DEFAULT_ALGORITHM_ID);
  const initialWorld = buildWorldFromConfig(initialAlgorithm);

  return {
    world: initialWorld,
    algorithm: initialAlgorithm,
    selectedAlgorithmId: DEFAULT_ALGORITHM_ID,

    status: "idle",
    elapsedTime: 0,
    completionTime: null,
    exitedCount: 0,
    remainingCount: initialWorld.people.length,
    averageExitTime: 0,
    activeCollisions: 0,
    worldVersion: 1,

    build() {
      const algorithm = buildAlgorithmFor(get().selectedAlgorithmId);
      const world = buildWorldFromConfig(algorithm);
      set({
        world,
        algorithm,
        worldVersion: get().worldVersion + 1,
        ...snapshotStats(world),
      });
    },

    reset() {
      get().build();
    },

    play() {
      const world = get().world;
      if (!world) return;
      if (world.status === "complete") return;
      world.status = "playing";
      set({ status: "playing" });
    },

    pause() {
      const world = get().world;
      if (!world) return;
      if (world.status !== "playing") return;
      world.status = "paused";
      set({ status: "paused" });
    },

    togglePlayPause() {
      const status = get().status;
      if (status === "playing") {
        get().pause();
      } else {
        get().play();
      }
    },

    step(deltaTime) {
      const world = get().world;
      if (!world) return;
      const wasPlaying = world.status === "playing";
      world.status = "playing";
      stepWorld(world, get().algorithm, deltaTime);
      if (!wasPlaying && world.status === "playing") {
        world.status = "paused";
      }
      set({ ...snapshotStats(world) });
    },

    tick(deltaTime) {
      const world = get().world;
      if (!world) return;
      if (world.status !== "playing") return;
      const speed = useConfigStore.getState().simulationConfig.animationSpeed;
      stepWorld(world, get().algorithm, deltaTime * speed);
      set({ ...snapshotStats(world) });
    },

    setAlgorithm(id) {
      const descriptor = ALGORITHM_INDEX[id];
      if (!descriptor) return;
      set({ selectedAlgorithmId: id });
      get().build();
    },
  };
});

export const selectAlgorithmDescriptor = (state: SimulationState) =>
  ALGORITHM_INDEX[state.selectedAlgorithmId];
