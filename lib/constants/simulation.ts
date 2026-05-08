/**
 * Default simulation tuning constants.
 *
 * Coordinate system (matches Three.js right-handed coordinates with the
 * camera aimed straight down the -Y axis):
 *   - x: chair-row direction (left/right when viewed from above)
 *   - z: row depth direction (back of the room is +z; wall exits at ±x and ±z)
 *   - y: vertical (only used to lift meshes off the floor for shading)
 *
 * Distances are in metres. Times are in seconds.
 */
export const SIM_DEFAULTS = {
  rowCount: 8,
  chairsPerHalfRow: 5,
  chairWidth: 0.5,
  chairDepth: 0.5,
  chairSpacing: 0.05,
  rowSpacing: 0.7,
  aisleWidth: 1.4,
  exitWidth: 1.8,
  exitDepth: 1.5,

  personWidth: 0.45,
  personDepth: 0.45,
  personHeight: 1.7,
  personSpeed: 1.1,
  collisionPadding: 0.05,

  animationSpeed: 1,
  // Must be >= (personDepth + 2*collisionPadding) / personSpeed for the
  // lane queue to form without overlap; default values give 0.55 m / 1.1 m/s
  // ≈ 0.5 s minimum, so 0.6 s leaves a comfortable margin.
  departureInterval: 0.6,
  burstSize: 2,
  /** Match simulation `activeExitDirections`: south → north → east → west. */
  activeExitDirections: 4,

  cameraPaddingX: 2,
  cameraPaddingZ: 4,
} as const;

export const PERSON_Y = SIM_DEFAULTS.personHeight / 2;
export const CHAIR_Y = 0.25;
export const FLOOR_Y = 0;

export const ALGORITHM_IDS = [
  "front-to-back",
  "back-to-front",
  "outside-in",
  "inside-out",
  "random",
] as const;

export type AlgorithmId = (typeof ALGORITHM_IDS)[number];

export const DEFAULT_ALGORITHM_ID: AlgorithmId = "front-to-back";
