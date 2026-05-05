"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { CHAIR_Y } from "@/lib/constants/simulation";
import type { Chair } from "../models/chair";

interface ChairsProps {
  chairs: Chair[];
}

const CHAIR_HEIGHT = 0.5;

/**
 * Render every chair as a single instanced mesh. We update the matrices when
 * the chair list changes (after a config edit + rebuild) but otherwise leave
 * the buffer untouched, since chairs don't move.
 */
export function Chairs({ chairs }: ChairsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    chairs.forEach((chair, index) => {
      dummy.position.set(chair.position.x, CHAIR_Y, chair.position.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(chair.width, CHAIR_HEIGHT, chair.depth);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.count = chairs.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [chairs, dummy]);

  if (chairs.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, chairs.length]}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshLambertMaterial color="#cbd5e1" />
    </instancedMesh>
  );
}
