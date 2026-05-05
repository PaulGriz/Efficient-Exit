import { SIM_DEFAULTS } from "@/lib/constants/simulation";
import type { Algorithm, AlgorithmContext } from "../models/algorithm";
import { drainQueue } from "./helpers";

const buildQueue = (ctx: AlgorithmContext): string[] =>
  ctx.people
    .slice()
    .sort((a, b) => {
      if (a.columnIndex !== b.columnIndex) return a.columnIndex - b.columnIndex;
      if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
      return a.side === "left" ? -1 : 1;
    })
    .map((p) => p.id);

export const createOutsideInAlgorithm = (
  burstSize: number = SIM_DEFAULTS.burstSize,
): Algorithm => {
  let queue: string[] = [];
  return {
    id: "outside-in",
    name: "Outside-in",
    description:
      "People closest to the centre aisle leave first, before deeper-row guests start moving.",
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
