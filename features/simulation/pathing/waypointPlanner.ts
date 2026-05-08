import { distanceXZ, type Vec2 } from "@/lib/math/aabb";
import type { Chair } from "../models/chair";
import type { RoomConfig, RoomGeometry } from "../models/room";

export type ExitCardinal = "north" | "south" | "east" | "west";

/** How many exits are active, following south → north → east → west. */
export type ActiveExitDirections = 1 | 2 | 3 | 4;

/** Order in which exits are enabled as `activeExitDirections` goes from 1 to 4. */
export const EXIT_CARDINAL_ORDER = [
  "south",
  "north",
  "east",
  "west",
] as const satisfies readonly ExitCardinal[];

interface GraphNode {
  id: string;
  point: Vec2;
}

interface GraphEdge {
  to: string;
  weight: number;
}

export const clampActiveExitDirections = (n: number): ActiveExitDirections => {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return 4;
  return Math.min(4, Math.max(1, x)) as ActiveExitDirections;
};

export const exitsForDirectionCount = (
  count: ActiveExitDirections,
): ExitCardinal[] => EXIT_CARDINAL_ORDER.slice(0, count);

/** Labels for the simulation slider (south → north → east → west). */
export const EXIT_DIRECTION_STEP_LABELS = [
  "South",
  "North",
  "East",
  "West",
] as const;

export const formatExitDirectionsLabel = (
  count: ActiveExitDirections,
): string => EXIT_DIRECTION_STEP_LABELS.slice(0, count).join(" · ");

const simplifyPath = (points: readonly Vec2[]): Vec2[] => {
  if (points.length <= 2) return [...points];
  const out: Vec2[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1]!;
    const b = points[i]!;
    const c = points[i + 1]!;
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const bcx = c.x - b.x;
    const bcz = c.z - b.z;
    if (Math.abs(abx * bcz - abz * bcx) > 1e-5) {
      out.push(b);
    }
  }
  out.push(points[points.length - 1]!);
  return out;
};

const rowGapZAt = (row: number, cfg: RoomConfig, geo: RoomGeometry): number =>
  geo.frontRowZ + row * (cfg.chairDepth + cfg.rowSpacing) + cfg.chairDepth / 2 + cfg.rowSpacing / 2;

const addUndirectedEdge = (
  edges: Map<string, GraphEdge[]>,
  nodes: Map<string, GraphNode>,
  from: string,
  to: string,
): void => {
  const a = nodes.get(from);
  const b = nodes.get(to);
  if (!a || !b) return;
  const w = distanceXZ(a.point, b.point);
  const add = (u: string, v: string) => {
    const list = edges.get(u);
    const edge: GraphEdge = { to: v, weight: w };
    if (list) {
      list.push(edge);
    } else {
      edges.set(u, [edge]);
    }
  };
  add(from, to);
  add(to, from);
};

const dijkstra = (
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge[]>,
  startId: string,
  goalIds: ReadonlySet<string>,
): string[] | null => {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const unvisited = new Set<string>(nodes.keys());
  for (const id of nodes.keys()) dist.set(id, Number.POSITIVE_INFINITY);
  dist.set(startId, 0);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const id of unvisited) {
      const d = dist.get(id) ?? Number.POSITIVE_INFINITY;
      if (d < best) {
        best = d;
        current = id;
      }
    }
    if (!current || best === Number.POSITIVE_INFINITY) break;
    unvisited.delete(current);
    if (goalIds.has(current)) {
      const path: string[] = [];
      let cursor: string | undefined = current;
      while (cursor) {
        path.push(cursor);
        cursor = prev.get(cursor);
      }
      path.reverse();
      return path;
    }

    const nextEdges = edges.get(current) ?? [];
    for (const edge of nextEdges) {
      if (!unvisited.has(edge.to)) continue;
      const alt = best + edge.weight;
      if (alt < (dist.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, current);
      }
    }
  }
  return null;
};

/**
 * Build a shortest-path route from seat to any enabled exit using Dijkstra on
 * a waypoint graph (row-gap lanes + exit portals). The graph only includes
 * enabled exit portals, so paths can terminate outside the room exclusively
 * through active exit openings.
 */
export const buildWaypoints = (
  chair: Chair,
  cfg: RoomConfig,
  geo: RoomGeometry,
  chairs: readonly Chair[],
  activeDirections: ActiveExitDirections = 4,
): Vec2[] => {
  void chairs;
  const enabled = exitsForDirectionCount(clampActiveExitDirections(activeDirections));
  const rowGapZ = chair.position.z + cfg.chairDepth / 2 + cfg.rowSpacing / 2;
  const start: Vec2 = { x: chair.position.x, z: rowGapZ };
  const inner = cfg.exitDepth * 0.4;
  const outer = cfg.exitDepth * 0.5;
  const laneLeftX = -cfg.aisleWidth / 4;
  const laneRightX = cfg.aisleWidth / 4;
  const openHalf = cfg.exitWidth / 2;

  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge[]>();
  const goalIds = new Set<string>();
  const addNode = (id: string, point: Vec2): void => {
    nodes.set(id, { id, point });
  };

  for (let row = 0; row < cfg.rowCount; row++) {
    const z = rowGapZAt(row, cfg, geo);
    addNode(`lane-L-${row}`, { x: laneLeftX, z });
    addNode(`lane-R-${row}`, { x: laneRightX, z });
  }

  for (let row = 0; row < cfg.rowCount; row++) {
    addUndirectedEdge(edges, nodes, `lane-L-${row}`, `lane-R-${row}`);
    if (row > 0) {
      addUndirectedEdge(edges, nodes, `lane-L-${row}`, `lane-L-${row - 1}`);
      addUndirectedEdge(edges, nodes, `lane-R-${row}`, `lane-R-${row - 1}`);
    }
  }

  addNode("start", start);
  addUndirectedEdge(edges, nodes, "start", `lane-L-${chair.rowIndex}`);
  addUndirectedEdge(edges, nodes, "start", `lane-R-${chair.rowIndex}`);

  if (enabled.includes("south")) {
    addNode("south-in-L", { x: laneLeftX, z: geo.exitSouthZ + inner });
    addNode("south-out-L", { x: laneLeftX, z: geo.exitSouthZ - outer });
    addNode("south-in-R", { x: laneRightX, z: geo.exitSouthZ + inner });
    addNode("south-out-R", { x: laneRightX, z: geo.exitSouthZ - outer });
    addUndirectedEdge(edges, nodes, "lane-L-0", "south-in-L");
    addUndirectedEdge(edges, nodes, "south-in-L", "south-out-L");
    addUndirectedEdge(edges, nodes, "lane-R-0", "south-in-R");
    addUndirectedEdge(edges, nodes, "south-in-R", "south-out-R");
    goalIds.add("south-out-L");
    goalIds.add("south-out-R");
  }

  if (enabled.includes("north")) {
    const back = cfg.rowCount - 1;
    addNode("north-in-L", { x: laneLeftX, z: geo.exitNorthZ - inner });
    addNode("north-out-L", { x: laneLeftX, z: geo.exitNorthZ + outer });
    addNode("north-in-R", { x: laneRightX, z: geo.exitNorthZ - inner });
    addNode("north-out-R", { x: laneRightX, z: geo.exitNorthZ + outer });
    addUndirectedEdge(edges, nodes, `lane-L-${back}`, "north-in-L");
    addUndirectedEdge(edges, nodes, "north-in-L", "north-out-L");
    addUndirectedEdge(edges, nodes, `lane-R-${back}`, "north-in-R");
    addUndirectedEdge(edges, nodes, "north-in-R", "north-out-R");
    goalIds.add("north-out-L");
    goalIds.add("north-out-R");
  }

  for (let row = 0; row < cfg.rowCount; row++) {
    const z = rowGapZAt(row, cfg, geo);
    if (Math.abs(z) > openHalf) continue;

    if (enabled.includes("east")) {
      const eastIn = `east-in-${row}`;
      const eastOut = `east-out-${row}`;
      addNode(eastIn, { x: geo.exitEastX - inner, z });
      addNode(eastOut, { x: geo.exitEastX + outer, z });
      addUndirectedEdge(edges, nodes, `lane-R-${row}`, eastIn);
      addUndirectedEdge(edges, nodes, eastIn, eastOut);
      goalIds.add(eastOut);
    }

    if (enabled.includes("west")) {
      const westIn = `west-in-${row}`;
      const westOut = `west-out-${row}`;
      addNode(westIn, { x: geo.exitWestX + inner, z });
      addNode(westOut, { x: geo.exitWestX - outer, z });
      addUndirectedEdge(edges, nodes, `lane-L-${row}`, westIn);
      addUndirectedEdge(edges, nodes, westIn, westOut);
      goalIds.add(westOut);
    }
  }

  if (goalIds.size === 0) return [start];

  const pathIds = dijkstra(nodes, edges, "start", goalIds);
  if (!pathIds || pathIds.length === 0) return [start];
  const points: Vec2[] = [];
  for (const id of pathIds) {
    const node = nodes.get(id);
    if (node) points.push(node.point);
  }
  return simplifyPath(points);
};
