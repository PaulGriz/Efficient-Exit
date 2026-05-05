"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapControls, OrthographicCamera } from "@react-three/drei";
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

  const controlsRef = useRef<React.ComponentRef<typeof MapControls>>(null);

  const cameraView = useMemo(() => {
    if (!world) return { width: 12, depth: 16 };
    return {
      width: world.geometry.width + SIM_DEFAULTS.cameraPaddingX,
      depth: world.geometry.depth + SIM_DEFAULTS.cameraPaddingZ,
    };
  }, [world]);

  useEffect(() => {
    controlsRef.current?.reset();
  }, [cameraResetTrigger, worldVersion]);

  if (!world) return null;

  const aspect = cameraView.width / cameraView.depth;
  const halfHeight = cameraView.depth / 2;
  const halfWidth = halfHeight * aspect;

  return (
    <>
      <OrthographicCamera
        makeDefault
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
        <ExitZone geometry={world.geometry} config={world.roomConfig} />
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
