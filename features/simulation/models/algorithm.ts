import type { AlgorithmId } from "@/lib/constants/simulation";
import type { Person } from "./person";
import type { RoomConfig, RoomGeometry } from "./room";

export interface AlgorithmContext {
  config: RoomConfig;
  geometry: RoomGeometry;
  people: Person[];
  /** Total elapsed simulation time, in seconds. */
  elapsedTime: number;
}

/**
 * Snapshot of mutable inputs that an algorithm uses to decide who is allowed
 * to leave their seat next. Algorithms must be pure: no randomness should
 * leak unless seeded explicitly inside the algorithm itself.
 */
export interface ReleaseDecision {
  /** Person ids that should transition `seated` -> `standing` this tick. */
  releaseIds: string[];
}

export interface Algorithm {
  id: AlgorithmId;
  name: string;
  description: string;
  /**
   * Called once when the simulation is reset/initialised. Algorithms can use
   * this hook to compute and cache a release order for the current people.
   */
  initialize: (ctx: AlgorithmContext) => void;
  /**
   * Called every simulation step while playing. Returns the ids of people who
   * should be released to start moving on this tick. The engine handles the
   * actual state transition + path bookkeeping.
   */
  getNextDepartures: (ctx: AlgorithmContext) => ReleaseDecision;
  /** Optional per-tick hook for algorithms that want to react to live state. */
  update?: (ctx: AlgorithmContext, deltaTime: number) => void;
  /** Optional reset hook to clear cached state between runs. */
  reset?: () => void;
}
