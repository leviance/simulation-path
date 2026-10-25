import { containsBox, mapRoot, validBox, type MapBox } from "./map-geometry.ts";
export type MapKind = "house" | "tree" | "park";
export type MapLayout = "districts" | "clustered" | "large";
export interface MapObject {
  readonly id: number;
  readonly kind: MapKind;
  readonly box: Readonly<MapBox>;
}
export const mapMaximumObjects = 150000;
export function validateMapObject(object: MapObject, root: MapBox) {
  if (
    !Number.isInteger(object.id) ||
    object.id < 0 ||
    object.id > 0xffffffff ||
    !["house", "tree", "park"].includes(object.kind) ||
    !validBox(object.box) ||
    !containsBox(root, object.box)
  )
    throw new RangeError("Invalid map object or object outside root");
}

// Dữ liệu có khu phố và diện tích thật; không lưu 100.000 record vào repository.
export function makeMapObjects(
  count = 100000,
  seed = 1,
  layout: MapLayout = "districts",
): MapObject[] {
  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count > mapMaximumObjects ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !["districts", "clustered", "large"].includes(layout)
  )
    throw new RangeError("Invalid map dataset options");
  let state = seed >>> 0 || 0x6d2b79f5;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const result: MapObject[] = [];
  for (let id = 0; id < count; id++) {
    const column = id % 400;
    const row = Math.floor(id / 400);
    const kind: MapKind = id % 11 === 0 ? "park" : id % 3 === 0 ? "tree" : "house";
    let width = 16 + random() * 32;
    let height = 16 + random() * 28;
    let x = -12800 + column * 64 + 6 + random() * 6;
    let y = -12000 + row * 64 + 6 + random() * 6;
    if (kind === "tree") {
      width = 14 + random() * 8;
      height = width;
    }
    if (kind === "park") {
      width = 44;
      height = 44;
    }
    if (layout === "clustered") {
      const cluster = id % 4;
      x = -6000 + (cluster % 2) * 10000 + random() * 1800;
      y = -6000 + Math.floor(cluster / 2) * 10000 + random() * 1800;
    }
    if (layout === "large" && id % 20 === 0) {
      width = 512 + random() * 1536;
      height = 256 + random() * 768;
      x = -15000 + random() * (30000 - width);
      y = -15000 + random() * (30000 - height);
    }
    const object = { id, kind, box: { x, y, width, height } };
    validateMapObject(object, mapRoot);
    result.push(object);
  }
  return result;
}
