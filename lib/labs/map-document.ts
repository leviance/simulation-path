import {
  containsBox,
  normalizedBox,
  right,
  bottom,
  translatedBox,
  type MapBox,
  type MapPoint,
} from "./map-geometry.ts";
import { makeMapObjects, mapMaximumObjects, type MapKind, type MapLayout } from "./map-data.ts";
import {
  MapQuadtree,
  defaultMapTreeConfig,
  queryMapBrute,
  type MapQuery,
  type MapTreeConfig,
} from "./map-quadtree.ts";

export interface MapEditMetrics {
  action: string;
  objects: number;
  milliseconds: number;
}
export class MapDocument {
  tree: MapQuadtree;
  readonly selection = new Set<number>();
  nextId = 0;
  useTree = true;
  lastQuery: MapQuery | null = null;
  selectionBox: MapBox | null = null;
  edit: MapEditMetrics | null = null;
  notice = "Chọn một đối tượng hoặc kéo vùng chọn.";

  constructor(
    count = 100000,
    seed = 1,
    layout: MapLayout = "districts",
    config: MapTreeConfig = defaultMapTreeConfig,
  ) {
    this.tree = new MapQuadtree(makeMapObjects(count, seed, layout), config);
    this.nextId = count;
  }

  query(box: MapBox): MapQuery {
    return this.useTree ? this.tree.query(box) : queryMapBrute(this.tree.objects.values(), box);
  }

  selectRegion(a: MapPoint, b: MapPoint, additive = false) {
    const box = normalizedBox(a, b);
    const query = this.query(box);
    if (!additive) this.selection.clear();
    for (const id of query.ids) this.selection.add(id);
    this.lastQuery = query;
    this.selectionBox = box;
    this.notice = `Đã chọn ${this.selection.size.toLocaleString("vi-VN")} đối tượng theo giao AABB.`;
    return query;
  }

  pick(point: MapPoint, toggle = false): number | null {
    const box = { ...point, width: 0, height: 0 };
    const query = this.query(box);
    // Renderer vẽ ID tăng dần: ID lớn nhất cũng là lớp trên cùng khi click.
    let top: number | null = null;
    for (const id of query.ids) if (top === null || id > top) top = id;
    if (!toggle) this.selection.clear();
    if (top !== null) {
      if (toggle && this.selection.has(top)) this.selection.delete(top);
      else this.selection.add(top);
    }
    this.lastQuery = query;
    this.selectionBox = box;
    return top;
  }

  selectionBounds(): MapBox | null {
    if (this.selection.size === 0) return null;
    let left = Infinity,
      top = Infinity,
      endX = -Infinity,
      endY = -Infinity;
    for (const id of this.selection) {
      const object = this.tree.objects.get(id);
      if (!object) throw new Error("Selection contains a deleted ID");
      left = Math.min(left, object.box.x);
      top = Math.min(top, object.box.y);
      endX = Math.max(endX, right(object.box));
      endY = Math.max(endY, bottom(object.box));
    }
    return { x: left, y: top, width: endX - left, height: endY - top };
  }

  canMove(offset: MapPoint): boolean {
    const bounds = this.selectionBounds();
    return bounds !== null && containsBox(this.tree.config.root, translatedBox(bounds, offset));
  }

  moveSelection(offset: MapPoint, now = () => performance.now()): boolean {
    const start = now();
    const count = this.selection.size;
    const moved = this.tree.translate(this.selection, offset.x, offset.y);
    this.edit = {
      action: moved ? "move" : "rollback",
      objects: count,
      milliseconds: now() - start,
    };
    this.lastQuery = null;
    this.notice = moved
      ? `Đã di chuyển ${count.toLocaleString("vi-VN")} đối tượng, giữ nguyên ID và selection.`
      : "Không di chuyển: nhóm vượt root hoặc dữ liệu không hợp lệ. Toàn bộ nhóm giữ nguyên vị trí.";
    return moved;
  }

  add(point: MapPoint, kind: MapKind, now = () => performance.now()): number | null {
    const start = now();
    const size = kind === "tree" ? 24 : kind === "park" ? 64 : 48;
    const box = {
      x: point.x - size / 2,
      y: point.y - size / 2,
      width: size,
      height: kind === "house" ? 32 : size,
    };
    if (
      this.nextId > 0xffffffff ||
      this.tree.objects.size >= mapMaximumObjects ||
      !containsBox(this.tree.config.root, box)
    ) {
      this.notice = "Không thêm: đối tượng vượt root hoặc hết không gian ID.";
      return null;
    }
    const id = this.nextId;
    this.tree.insert({ id, kind, box });
    this.nextId++;
    this.selection.clear();
    this.selection.add(id);
    this.lastQuery = null;
    this.edit = { action: "insert", objects: 1, milliseconds: now() - start };
    this.notice = `Đã thêm ${kind}, ID ${id}.`;
    return id;
  }

  deleteSelection(now = () => performance.now()) {
    const start = now();
    const count = this.selection.size;
    for (const id of this.selection) this.tree.remove(id);
    this.selection.clear();
    this.lastQuery = null;
    this.edit = { action: "remove", objects: count, milliseconds: now() - start };
    this.notice = `Đã xóa ${count.toLocaleString("vi-VN")} đối tượng; ID không được tái sử dụng.`;
  }

  rebuild(capacity = this.tree.config.capacity, now = () => performance.now()) {
    const start = now();
    const tree = new MapQuadtree(this.tree.objects.values(), { ...this.tree.config, capacity });
    tree.revision = this.tree.revision + 1;
    this.tree = tree;
    this.lastQuery = null;
    this.edit = { action: "rebuild", objects: tree.objects.size, milliseconds: now() - start };
  }
}
