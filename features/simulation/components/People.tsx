"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PERSON_Y } from "@/lib/constants/simulation";
import type { Person } from "../models/person";
import { useSimulationStore } from "../stores/useSimulationStore";

interface PeopleProps {
  people: Person[];
}

const BLOCKED_COLOR = "#ef4444";
const EXITED_COLOR = "#1e293b";

const PERSON_HEIGHT = 1.5;

const HIDDEN_Y = -10;

const colorFor = (
  person: Person,
  scratch: THREE.Color,
  fallback: THREE.Color,
): THREE.Color => {
  if (person.state === "exited") return scratch.set(EXITED_COLOR);
  if (person.blocked) return scratch.set(BLOCKED_COLOR);
  return scratch.copy(fallback);
};

/**
 * One mesh per guest. We avoided `InstancedMesh` here because the
 * `vertexColors` + `setColorAt` pipeline interacts badly with at least one
 * combination of Three.js / R3F we ship with — the per-instance colour
 * buffer ends up uninitialised in the first paint and the people render as
 * black. With ~80 guests the cost of one draw call per person is
 * negligible, so we trade the throughput for a render path that simply
 * works.
 *
 * Per-person matrix and colour updates happen inside `useFrame` directly
 * against each mesh's ref, so React never re-renders this component during
 * the simulation loop.
 */
export function People({ people }: PeopleProps) {
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Pre-resolve each person's identity Color object once. We pass these
  // into the highlight-aware `colorFor` so the per-frame loop never has to
  // re-parse HSL strings.
  const baseColors = useMemo(() => {
    const map = new Map<string, THREE.Color>();
    for (const p of people) {
      map.set(p.id, new THREE.Color(p.color));
    }
    return map;
  }, [people]);

  useFrame(() => {
    const live = useSimulationStore.getState().world?.people;
    if (!live) return;

    for (const p of live) {
      const mesh = meshRefs.current.get(p.id);
      if (!mesh) continue;
      const visible = p.state !== "exited";
      mesh.position.set(p.position.x, visible ? PERSON_Y : HIDDEN_Y, p.position.z);
      const base = baseColors.get(p.id);
      if (!base) continue;
      const next = colorFor(p, tempColor, base);
      const material = mesh.material as THREE.MeshBasicMaterial;
      if (!material.color.equals(next)) {
        material.color.copy(next);
      }
    }
  });

  if (people.length === 0) return null;

  return (
    <group>
      {people.map((p) => (
        <mesh
          key={p.id}
          ref={(node) => {
            if (node) meshRefs.current.set(p.id, node);
            else meshRefs.current.delete(p.id);
          }}
          position={[p.position.x, PERSON_Y, p.position.z]}
          scale={[p.width, PERSON_HEIGHT, p.depth]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={p.color} />
        </mesh>
      ))}
    </group>
  );
}
