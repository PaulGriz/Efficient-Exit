import type { AlgorithmId } from "@/lib/constants/simulation";
import type { Algorithm } from "../models/algorithm";
import { createBackToFrontAlgorithm } from "./backToFront";
import { createFrontToBackAlgorithm } from "./frontToBack";
import { createInsideOutAlgorithm } from "./insideOut";
import { createOutsideInAlgorithm } from "./outsideIn";
import { createRandomAlgorithm } from "./random";

export interface AlgorithmDescriptor {
  id: AlgorithmId;
  name: string;
  description: string;
  factory: (burstSize?: number) => Algorithm;
}

export const ALGORITHMS: AlgorithmDescriptor[] = [
  {
    id: "front-to-back",
    name: "Front-to-back",
    description:
      "Front rows leave first, back rows leave last. Models a typical wedding-style dismissal.",
    factory: createFrontToBackAlgorithm,
  },
  {
    id: "back-to-front",
    name: "Back-to-front",
    description:
      "Back rows leave first. Avoids the common bottleneck of releasing the front rows into a busy aisle.",
    factory: createBackToFrontAlgorithm,
  },
  {
    id: "outside-in",
    name: "Outside-in",
    description:
      "People closest to the centre aisle leave first, before deeper-row guests start moving.",
    factory: createOutsideInAlgorithm,
  },
  {
    id: "inside-out",
    name: "Inside-out",
    description:
      "Furthest seats leave first so the aisle is clear by the time inner seats fill it.",
    factory: createInsideOutAlgorithm,
  },
  {
    id: "random",
    name: "Random",
    description:
      "Releases guests in a randomised order. Useful as a baseline against the deterministic strategies.",
    factory: createRandomAlgorithm,
  },
];

export const ALGORITHM_INDEX: Record<AlgorithmId, AlgorithmDescriptor> = ALGORITHMS.reduce(
  (acc, descriptor) => {
    acc[descriptor.id] = descriptor;
    return acc;
  },
  {} as Record<AlgorithmId, AlgorithmDescriptor>,
);

export const createAlgorithm = (id: AlgorithmId, burstSize?: number): Algorithm => {
  const descriptor = ALGORITHM_INDEX[id];
  return descriptor.factory(burstSize);
};
