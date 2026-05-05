"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Person } from "../models/person";

interface PathsProps {
  people: Person[];
}

/**
 * Render the full waypoint path of every person as a thin polyline. Used by
 * the debug overlay; turn off in normal viewing for clarity.
 */
export function Paths({ people }: PathsProps) {
  const segments = useMemo(() => {
    const verts: number[] = [];
    const colors: number[] = [];
    for (const person of people) {
      const points: { x: number; z: number }[] = [
        person.origin,
        ...person.waypoints,
      ];
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i]!;
        const b = points[i + 1]!;
        verts.push(a.x, 0.05, a.z, b.x, 0.05, b.z);
        const intensity = i / Math.max(points.length - 1, 1);
        colors.push(
          0.5 + intensity * 0.5,
          0.6 + intensity * 0.3,
          1,
          0.5 + intensity * 0.5,
          0.6 + intensity * 0.3,
          1,
        );
      }
    }
    return { verts: new Float32Array(verts), colors: new Float32Array(colors) };
  }, [people]);

  if (people.length === 0) return null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[segments.verts, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[segments.colors, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.5} />
    </lineSegments>
  );
}

/**
 * Convenience helper for tests: convert a path into a Three.js Vector3 list.
 * Not used directly by the renderer but kept here so the math lives next to
 * the visualisation.
 */
export const toVector3List = (
  points: { x: number; z: number }[],
  y = 0.05,
): THREE.Vector3[] => points.map(({ x, z }) => new THREE.Vector3(x, y, z));
