"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { aabbFromCenter } from "@/lib/math/aabb";
import { useSimulationStore } from "../stores/useSimulationStore";

interface CollisionDebugProps {
  count: number;
  collisionPadding: number;
}

const DEBUG_HEIGHT = 0.05;

/**
 * Draws the live person AABBs as thin wireframes plus a translucent
 * highlight on currently-blocked individuals. Driven entirely off the live
 * simulation world reference, no React state per frame.
 */
export function CollisionDebug({ count, collisionPadding }: CollisionDebugProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const live = useSimulationStore.getState().world?.people;
    if (!live) return;

    let visibleIndex = 0;
    for (let i = 0; i < live.length; i++) {
      const p = live[i]!;
      if (p.state === "exited") {
        dummy.position.set(0, -10, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const box = aabbFromCenter(
        p.position.x,
        p.position.z,
        p.width,
        p.depth,
        collisionPadding,
      );
      const w = box.maxX - box.minX;
      const d = box.maxZ - box.minZ;
      dummy.position.set(p.position.x, DEBUG_HEIGHT, p.position.z);
      dummy.scale.set(w, 0.02, d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      tempColor.set(p.blocked ? "#ef4444" : "#a3e635");
      mesh.setColorAt(i, tempColor);
      visibleIndex += 1;
    }
    mesh.count = live.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    void visibleIndex;
  });

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color="#ffffff"
        vertexColors
        wireframe
        transparent
        opacity={0.85}
      />
    </instancedMesh>
  );
}
