import type { AlgorithmContext, ReleaseDecision } from "../models/algorithm";
import type { Person } from "../models/person";

/**
 * Drain the next batch of seated people from a pre-computed order. Used by
 * every deterministic algorithm to share the same release pacing logic.
 */
export const drainQueue = (
  queue: string[],
  ctx: AlgorithmContext,
  burstSize: number,
): ReleaseDecision => {
  const releaseIds: string[] = [];
  while (queue.length > 0 && releaseIds.length < burstSize) {
    const id = queue.shift()!;
    const person = ctx.people.find((p) => p.id === id);
    if (person && person.state === "seated") {
      releaseIds.push(id);
    }
  }
  return { releaseIds };
};

/** Stable comparator that breaks row-ties using column-then-side ordering. */
export const compareWithinRow = (a: Person, b: Person): number => {
  if (a.columnIndex !== b.columnIndex) return a.columnIndex - b.columnIndex;
  if (a.side !== b.side) return a.side === "left" ? -1 : 1;
  return a.id.localeCompare(b.id);
};

/**
 * Mulberry32 deterministic PRNG, used so the random algorithm produces a
 * different order on every reset but is testable.
 */
export const createRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const shuffle = <T,>(items: T[], rng: () => number): T[] => {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = result[i]!;
    const b = result[j]!;
    result[i] = b;
    result[j] = a;
  }
  return result;
};
