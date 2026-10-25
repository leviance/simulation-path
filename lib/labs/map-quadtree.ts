import { containsBox, intersects, validBox, type MapBox } from "./map-geometry.ts";
import { mapMaximumObjects, validateMapObject, type MapObject } from "./map-data.ts";

export interface MapTreeConfig {
  root: MapBox;
  capacity: number;
  maximumDepth: number;
  minimumSize: number;
  maximumNodes: number;
}
export interface MapTreeNode {
  box: MapBox;
  depth: number;
  ids: Set<number>;
  children: number[] | null;
}
export interface MapQuery {
  ids: number[];
  visited: number[];
  pruned: number[];
  candidates: number;
  milliseconds: number;
}
export const defaultMapTreeConfig: MapTreeConfig = {
  root: { x: -16384, y: -16384, width: 32768, height: 32768 },
  capacity: 16,
  maximumDepth: 12,
  minimumSize: 4,
  maximumNodes: 262145,
};

// Mỗi object chỉ lưu một lần. Object cắt split ở lại node cha.
export class MapQuadtree {
  readonly config: MapTreeConfig;
  private readonly objectsById = new Map<number, MapObject>();
  readonly nodes: MapTreeNode[] = [];
  readonly location = new Map<number, number>();
  revision = 0;
  buildMilliseconds = 0;

  get objects(): ReadonlyMap<number, MapObject> {
    return this.objectsById;
  }

  constructor(
    objects: Iterable<MapObject> = [],
    config = defaultMapTreeConfig,
    now = () => performance.now(),
  ) {
    const start = now();
    if (
      !validBox(config.root) ||
      !Number.isInteger(config.capacity) ||
      config.capacity < 1 ||
      config.capacity > 128 ||
      !Number.isInteger(config.maximumDepth) ||
      config.maximumDepth < 0 ||
      config.maximumDepth > 16 ||
      !Number.isFinite(config.minimumSize) ||
      config.minimumSize <= 0 ||
      !Number.isInteger(config.maximumNodes) ||
      config.maximumNodes < 1 ||
      config.maximumNodes > 262145
    )
      throw new RangeError("Invalid Quadtree limits");
    this.config = { ...config, root: { ...config.root } };
    this.nodes.push({ box: { ...config.root }, depth: 0, ids: new Set(), children: null });
    for (const object of objects) this.insert(object);
    this.buildMilliseconds = now() - start;
  }

  childSlot(box: MapBox, node: MapTreeNode): number {
    const midX = node.box.x + node.box.width / 2;
    const midY = node.box.y + node.box.height / 2;
    let column = -1;
    let row = -1;
    if (box.x + box.width <= midX) column = 0;
    else if (box.x >= midX) column = 1;
    if (box.y + box.height <= midY) row = 0;
    else if (box.y >= midY) row = 1;
    return column < 0 || row < 0 ? -1 : row * 2 + column;
  }

  private canSplit(node: MapTreeNode) {
    return (
      node.depth < this.config.maximumDepth &&
      node.box.width / 2 >= this.config.minimumSize &&
      node.box.height / 2 >= this.config.minimumSize &&
      this.nodes.length + 4 <= this.config.maximumNodes
    );
  }

  private insertAt(nodeIndex: number, id: number) {
    const node = this.nodes[nodeIndex];
    if (node.children) {
      const slot = this.childSlot(this.objects.get(id)!.box, node);
      if (slot >= 0) {
        this.insertAt(node.children[slot], id);
        return;
      }
    }
    node.ids.add(id);
    this.location.set(id, nodeIndex);
    if (!node.children && node.ids.size > this.config.capacity && this.canSplit(node))
      this.split(nodeIndex);
  }

  private split(nodeIndex: number) {
    const node = this.nodes[nodeIndex];
    const children: number[] = [];
    for (let slot = 0; slot < 4; slot++) {
      children.push(this.nodes.length);
      this.nodes.push({
        box: {
          x: node.box.x + ((slot % 2) * node.box.width) / 2,
          y: node.box.y + (Math.floor(slot / 2) * node.box.height) / 2,
          width: node.box.width / 2,
          height: node.box.height / 2,
        },
        depth: node.depth + 1,
        ids: new Set(),
        children: null,
      });
    }
    node.children = children;
    const previous = [...node.ids];
    node.ids.clear();
    for (const id of previous) this.insertAt(nodeIndex, id);
  }

  insert(object: MapObject) {
    validateMapObject(object, this.config.root);
    if (this.objects.has(object.id) || this.objects.size >= mapMaximumObjects)
      throw new RangeError("Duplicate ID or map object limit");
    this.objectsById.set(object.id, { ...object, box: { ...object.box } });
    this.insertAt(0, object.id);
    this.revision++;
  }

  remove(id: number): boolean {
    const node = this.location.get(id);
    if (node === undefined) return false;
    this.nodes[node].ids.delete(id);
    this.location.delete(id);
    this.objectsById.delete(id);
    this.revision++;
    return true;
  }

  // Kiểm toàn bộ proposal trước khi ghi, nên vượt root không làm di chuyển nửa nhóm.
  translate(ids: Iterable<number>, dx: number, dy: number): boolean {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
    const proposals: MapObject[] = [];
    for (const id of new Set(ids)) {
      const object = this.objects.get(id);
      if (!object) return false;
      const proposal = {
        ...object,
        box: { ...object.box, x: object.box.x + dx, y: object.box.y + dy },
      };
      if (!validBox(proposal.box) || !containsBox(this.config.root, proposal.box)) return false;
      proposals.push(proposal);
    }
    for (const proposal of proposals) this.remove(proposal.id);
    for (const proposal of proposals) this.insert(proposal);
    return true;
  }

  query(box: MapBox, now = () => performance.now()): MapQuery {
    if (!validBox(box, true)) throw new RangeError("Invalid query box");
    const start = now();
    const result: MapQuery = { ids: [], visited: [], pruned: [], candidates: 0, milliseconds: 0 };
    const stack = [0];
    while (stack.length) {
      const index = stack.pop()!;
      const node = this.nodes[index];
      if (!intersects(node.box, box)) {
        result.pruned.push(index);
        continue;
      }
      result.visited.push(index);
      for (const id of node.ids) {
        result.candidates++;
        if (intersects(this.objects.get(id)!.box, box)) result.ids.push(id);
      }
      if (node.children) stack.push(...node.children);
    }
    result.milliseconds = now() - start;
    return result;
  }
}

export function queryMapBrute(
  objects: Iterable<MapObject>,
  box: MapBox,
  now = () => performance.now(),
): MapQuery {
  if (!validBox(box, true)) throw new RangeError("Invalid query box");
  const start = now();
  const result: MapQuery = { ids: [], visited: [], pruned: [], candidates: 0, milliseconds: 0 };
  for (const object of objects) {
    result.candidates++;
    if (intersects(object.box, box)) result.ids.push(object.id);
  }
  result.milliseconds = now() - start;
  return result;
}
