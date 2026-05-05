import { SIM_DEFAULTS } from "@/lib/constants/simulation";
import type { Algorithm, AlgorithmContext } from "../models/algorithm";
import { compareWithinRow, drainQueue } from "./helpers";

const buildQueue = (ctx: AlgorithmContext): string[] =>
  ctx.people
    .slice()
    .sort((a, b) => {
      if (a.rowIndex !== b.rowIndex) return b.rowIndex - a.rowIndex;
      return compareWithinRow(a, b);
    })
    .map((p) => p.id);

export const createBackToFrontAlgorithm = (
  burstSize: number = SIM_DEFAULTS.burstSize,
): Algorithm => {
  let queue: string[] = [];
  return {
    id: "back-to-front",
    name: "Back-to-front",
    description:
      "Back rows leave first. Avoids the common bottleneck of releasing the front rows into a busy aisle.",
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
