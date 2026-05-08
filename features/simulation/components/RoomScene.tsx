"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { MapControls, OrthographicCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { OrthographicCamera as ThreeOrthographicCamera } from "three";
import { SIM_DEFAULTS } from "@/lib/constants/simulation";
import { useSimulationStore } from "../stores/useSimulationStore";
import { useUiStore } from "../stores/useUiStore";
import { Floor } from "./Floor";
import { Chairs } from "./Chairs";
import { People } from "./People";
import { ExitZone } from "./ExitZone";
import { Paths } from "./Paths";
import { CollisionDebug } from "./CollisionDebug";
import { SimulationLoop } from "./SimulationLoop";

interface RoomSceneProps {
  /** Bumped on every world rebuild so the scene resets all instanced meshes. */
  worldVersion: number;
}

export function RoomScene({ worldVersion }: RoomSceneProps) {
  const world = useSimulationStore((state) => state.world);
  const debug = useUiStore((state) => state.debug);
  const cameraResetTrigger = useUiStore((state) => state.cameraResetTrigger);
  const canvasSize = useThree((state) => state.size);

  const cameraRef = useRef<ThreeOrthographicCamera>(null);
  const controlsRef = useRef<React.ComponentRef<typeof MapControls>>(null);

  const cameraFrustum = useMemo(() => {
    const roomWidth = world
      ? world.geometry.width + SIM_DEFAULTS.cameraPaddingX
      : 12;
    const roomDepth = world
      ? world.geometry.depth + SIM_DEFAULTS.cameraPaddingZ
      : 16;
    const roomAspect = roomWidth / roomDepth;
    const hasValidViewport = canvasSize.width > 0 && canvasSize.height > 0;
    const viewportAspect = hasValidViewport
      ? canvasSize.width / canvasSize.height
      : roomAspect;

    if (viewportAspect >= roomAspect) {
      const halfHeight = roomDepth / 2;
      return {
        halfHeight,
        halfWidth: halfHeight * viewportAspect,
      };
    }

    const halfWidth = roomWidth / 2;
    return {
      halfWidth,
      halfHeight: halfWidth / viewportAspect,
    };
  }, [canvasSize.height, canvasSize.width, world]);

  const resetCameraView = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    camera.position.set(0, 30, 0);
    camera.rotation.set(-Math.PI / 2, 0, 0);
    camera.zoom = 1;
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.update();
  }, []);

  useEffect(() => {
    resetCameraView();
  }, [cameraResetTrigger, resetCameraView, worldVersion]);

  if (!world) return null;

  const { halfWidth, halfHeight } = cameraFrustum;

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}
        makeDefault
        manual
        position={[0, 30, 0]}
        zoom={1}
        left={-halfWidth}
        right={halfWidth}
        top={halfHeight}
        bottom={-halfHeight}
        near={0.1}
        far={200}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <MapControls
        ref={controlsRef}
        makeDefault
        enableRotate={false}
        enablePan
        enableZoom
        screenSpacePanning={false}
        minZoom={0.4}
        maxZoom={6}
        zoomSpeed={1.2}
        panSpeed={1.0}
      />

      <ambientLight intensity={1.0} />
      <hemisphereLight args={["#cfd8e3", "#1c2533", 0.6]} />
      <directionalLight position={[10, 20, 10]} intensity={1.0} />

      <Floor geometry={world.geometry} />
      <Chairs key={`chairs-${worldVersion}`} chairs={world.chairs} />
      <People key={`people-${worldVersion}`} people={world.people} />
      {debug.showExitZone ? (
        <ExitZone
          geometry={world.geometry}
          config={world.roomConfig}
          activeDirections={world.simulationConfig.activeExitDirections}
        />
      ) : null}
      {debug.showPaths ? <Paths people={world.people} /> : null}
      {debug.showCollisionBoxes ? (
        <CollisionDebug
          key={`debug-${worldVersion}`}
          count={world.people.length}
          collisionPadding={world.simulationConfig.collisionPadding}
        />
      ) : null}

      <SimulationLoop />
    </>
  );
}
