import type { AABB } from "@/lib/math/aabb";
import { aabbIntersects } from "@/lib/math/aabb";

export interface GridEntry<T> {
  id: string;
  bounds: AABB;
  payload: T;
}

/**
 * Uniform spatial hash grid for broad-phase collision checks.
 *
 * Supports incremental updates: callers can {@link insert}, {@link remove},
 * or {@link update} entries between queries so that the grid always reflects
 * the latest position of each tracked body. This is what makes "yielding"
 * collision resolution work — when person A moves and the resolver commits
 * the new position, person B's subsequent collision query sees A at the new
 * position rather than the stale start-of-tick one.
 */
export class SpatialGrid<T> {
  private readonly cellSize: number;
  private readonly cells = new Map<string, GridEntry<T>[]>();
  /** Latest known bounds for each entry, keyed by id. */
  private readonly entries = new Map<string, GridEntry<T>>();

  constructor(cellSize: number) {
    if (cellSize <= 0) {
      throw new Error("SpatialGrid cellSize must be > 0");
    }
    this.cellSize = cellSize;
  }

  clear(): void {
    this.cells.clear();
    this.entries.clear();
  }

  insert(entry: GridEntry<T>): void {
    if (this.entries.has(entry.id)) {
      this.removeFromCells(this.entries.get(entry.id)!);
    }
    this.entries.set(entry.id, entry);
    this.insertIntoCells(entry);
  }

  /**
   * Replace the entry with the given id with `entry` (which may have new
   * bounds). Equivalent to {@link insert} but documented as the "I know this
   * id already exists" entry point.
   */
  update(entry: GridEntry<T>): void {
    this.insert(entry);
  }

  remove(id: string): void {
    const existing = this.entries.get(id);
    if (!existing) return;
    this.removeFromCells(existing);
    this.entries.delete(id);
  }

  query(bounds: AABB, excludeId?: string): GridEntry<T>[] {
    const seen = new Set<string>();
    const hits: GridEntry<T>[] = [];
    const { minCellX, minCellZ, maxCellX, maxCellZ } = this.bucketRange(bounds);
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const list = this.cells.get(this.key(cx, cz));
        if (!list) continue;
        for (const entry of list) {
          if (entry.id === excludeId) continue;
          if (seen.has(entry.id)) continue;
          if (aabbIntersects(entry.bounds, bounds)) {
            seen.add(entry.id);
            hits.push(entry);
          }
        }
      }
    }
    return hits;
  }

  private insertIntoCells(entry: GridEntry<T>): void {
    const { minCellX, minCellZ, maxCellX, maxCellZ } = this.bucketRange(
      entry.bounds,
    );
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const key = this.key(cx, cz);
        const list = this.cells.get(key);
        if (list) {
          list.push(entry);
        } else {
          this.cells.set(key, [entry]);
        }
      }
    }
  }

  private removeFromCells(entry: GridEntry<T>): void {
    const { minCellX, minCellZ, maxCellX, maxCellZ } = this.bucketRange(
      entry.bounds,
    );
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const key = this.key(cx, cz);
        const list = this.cells.get(key);
        if (!list) continue;
        const idx = list.findIndex((candidate) => candidate.id === entry.id);
        if (idx >= 0) list.splice(idx, 1);
        if (list.length === 0) this.cells.delete(key);
      }
    }
  }

  private bucketRange(bounds: AABB) {
    return {
      minCellX: Math.floor(bounds.minX / this.cellSize),
      minCellZ: Math.floor(bounds.minZ / this.cellSize),
      maxCellX: Math.floor(bounds.maxX / this.cellSize),
      maxCellZ: Math.floor(bounds.maxZ / this.cellSize),
    };
  }

  private key(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }
}
