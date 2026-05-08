"use client";

import { create } from "zustand";
import { SIM_DEFAULTS } from "@/lib/constants/simulation";
import type { RoomConfig } from "../models/room";
import type { SimulationConfig } from "../engine/simulationEngine";
import { clampActiveExitDirections } from "../pathing/waypointPlanner";

export interface ConfigState {
  roomConfig: RoomConfig;
  simulationConfig: SimulationConfig;
  setRoomConfig: (patch: Partial<RoomConfig>) => void;
  setSimulationConfig: (patch: Partial<SimulationConfig>) => void;
  resetToDefaults: () => void;
}

const defaultRoomConfig: RoomConfig = {
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

const totalChairs = (cfg: RoomConfig): number =>
  cfg.rowCount * cfg.chairsPerHalfRow * 2;

const defaultSimulationConfig: SimulationConfig = {
  peopleCount: totalChairs(defaultRoomConfig),
  personWidth: SIM_DEFAULTS.personWidth,
  personDepth: SIM_DEFAULTS.personDepth,
  personSpeed: SIM_DEFAULTS.personSpeed,
  collisionPadding: SIM_DEFAULTS.collisionPadding,
  departureInterval: SIM_DEFAULTS.departureInterval,
  burstSize: SIM_DEFAULTS.burstSize,
  animationSpeed: SIM_DEFAULTS.animationSpeed,
  activeExitDirections: clampActiveExitDirections(SIM_DEFAULTS.activeExitDirections),
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  roomConfig: { ...defaultRoomConfig },
  simulationConfig: { ...defaultSimulationConfig },
  setRoomConfig(patch) {
    const nextRoom = { ...get().roomConfig, ...patch };
    const cap = totalChairs(nextRoom);
    set((state) => ({
      roomConfig: nextRoom,
      simulationConfig: {
        ...state.simulationConfig,
        peopleCount: Math.min(state.simulationConfig.peopleCount, cap),
      },
    }));
  },
  setSimulationConfig(patch) {
    const nextSim = { ...get().simulationConfig, ...patch };
    if (patch.activeExitDirections !== undefined) {
      nextSim.activeExitDirections = clampActiveExitDirections(
        patch.activeExitDirections,
      );
    }
    const cap = totalChairs(get().roomConfig);
    set({
      simulationConfig: {
        ...nextSim,
        peopleCount: Math.min(Math.max(nextSim.peopleCount, 0), cap),
      },
    });
  },
  resetToDefaults() {
    set({
      roomConfig: { ...defaultRoomConfig },
      simulationConfig: { ...defaultSimulationConfig },
    });
  },
}));

export const selectMaxPeople = (state: ConfigState): number =>
  state.roomConfig.rowCount * state.roomConfig.chairsPerHalfRow * 2;
