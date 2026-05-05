import { SIM_DEFAULTS } from "@/lib/constants/simulation";
import type { Algorithm } from "../models/algorithm";
import { createRng, drainQueue, shuffle } from "./helpers";

export const createRandomAlgorithm = (
  burstSize: number = SIM_DEFAULTS.burstSize,
): Algorithm => {
  let queue: string[] = [];
  return {
    id: "random",
    name: "Random",
    description:
      "Releases guests in a randomised order. Useful as a baseline against the deterministic strategies.",
    initialize(ctx) {
      const rng = createRng(Math.floor(Math.random() * 0xffffffff) || 1);
      queue = shuffle(ctx.people, rng).map((p) => p.id);
    },
    getNextDepartures(ctx) {
      return drainQueue(queue, ctx, burstSize);
    },
    reset() {
      queue = [];
    },
  };
};
