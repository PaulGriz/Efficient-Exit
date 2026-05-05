import { SIM_DEFAULTS } from "@/lib/constants/simulation";
import type { Algorithm, AlgorithmContext } from "../models/algorithm";
import { compareWithinRow, drainQueue } from "./helpers";

const buildQueue = (ctx: AlgorithmContext): string[] =>
  ctx.people
    .slice()
    .sort((a, b) => {
      if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
      return compareWithinRow(a, b);
    })
    .map((p) => p.id);

export const createFrontToBackAlgorithm = (
  burstSize: number = SIM_DEFAULTS.burstSize,
): Algorithm => {
  let queue: string[] = [];
  return {
    id: "front-to-back",
    name: "Front-to-back",
    description:
      "Front rows leave first, back rows leave last. Models a typical wedding-style dismissal.",
    initialize(ctx) {
      queue = buildQueue(ctx);
    },
    getNextDepartures(ctx) {
      return drainQueue(queue, ctx, burstSize);
    },
    reset() {
      queue = [];
    },
  };
};
