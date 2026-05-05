import { SIM_DEFAULTS } from "@/lib/constants/simulation";
import type { Algorithm, AlgorithmContext } from "../models/algorithm";
import { drainQueue } from "./helpers";

const buildQueue = (ctx: AlgorithmContext): string[] =>
  ctx.people
    .slice()
    .sort((a, b) => {
      if (a.columnIndex !== b.columnIndex) return b.columnIndex - a.columnIndex;
      if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
      return a.side === "left" ? -1 : 1;
    })
    .map((p) => p.id);

export const createInsideOutAlgorithm = (
  burstSize: number = SIM_DEFAULTS.burstSize,
): Algorithm => {
  let queue: string[] = [];
  return {
    id: "inside-out",
    name: "Inside-out",
    description:
      "Furthest seats leave first so the aisle is clear by the time inner seats fill it.",
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
