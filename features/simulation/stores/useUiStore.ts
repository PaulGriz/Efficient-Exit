"use client";

import { create } from "zustand";

export interface DebugOptions {
  showCollisionBoxes: boolean;
  showPaths: boolean;
  showExitZone: boolean;
  showRoomGrid: boolean;
}

export interface ControlsPanelPosition {
  x: number;
  y: number;
}

export interface UiState {
  controlsPanelOpen: boolean;
  /**
   * Pixel-space position of the floating controls panel, relative to the
   * simulation viewport. `{ x: -1, y: -1 }` is a sentinel meaning "not yet
   * placed" — the panel applies a smart default once the container size is
   * known.
   */
  controlsPanelPosition: ControlsPanelPosition;
  sidebarOpen: boolean;
  debug: DebugOptions;
  /**
   * Counter incremented when the user requests a camera reset. The in-canvas
   * `MapControls` watches this and calls `controls.reset()` on change.
   */
  cameraResetTrigger: number;
  toggleControlsPanel: () => void;
  setControlsPanelOpen: (open: boolean) => void;
  setControlsPanelPosition: (position: ControlsPanelPosition) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setDebug: (patch: Partial<DebugOptions>) => void;
  requestCameraReset: () => void;
}

export const CONTROLS_PANEL_POSITION_SENTINEL: ControlsPanelPosition = {
  x: -1,
  y: -1,
};

export const isControlsPanelPositionSentinel = (
  position: ControlsPanelPosition,
): boolean => position.x === -1 && position.y === -1;

export const useUiStore = create<UiState>((set) => ({
  controlsPanelOpen: true,
  controlsPanelPosition: CONTROLS_PANEL_POSITION_SENTINEL,
  sidebarOpen: true,
  debug: {
    showCollisionBoxes: false,
    showPaths: false,
    showExitZone: true,
    showRoomGrid: false,
  },
  cameraResetTrigger: 0,
  toggleControlsPanel: () =>
    set((state) => ({ controlsPanelOpen: !state.controlsPanelOpen })),
  setControlsPanelOpen: (controlsPanelOpen) => set({ controlsPanelOpen }),
  setControlsPanelPosition: (controlsPanelPosition) =>
    set({ controlsPanelPosition }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setDebug: (patch) =>
    set((state) => ({ debug: { ...state.debug, ...patch } })),
  requestCameraReset: () =>
    set((state) => ({ cameraResetTrigger: state.cameraResetTrigger + 1 })),
}));
