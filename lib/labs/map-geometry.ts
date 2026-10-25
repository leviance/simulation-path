export interface MapPoint {
  x: number;
  y: number;
}
export interface MapBox extends MapPoint {
  width: number;
  height: number;
}
export interface MapCamera {
  x: number;
  y: number;
  zoom: number;
}
export interface MapSize {
  width: number;
  height: number;
}

export const mapRoot: Readonly<MapBox> = { x: -16384, y: -16384, width: 32768, height: 32768 };
export const right = (box: MapBox) => box.x + box.width;
export const bottom = (box: MapBox) => box.y + box.height;
export function validBox(box: MapBox, allowEmpty = false) {
  return (
    [box.x, box.y, box.width, box.height, right(box), bottom(box)].every(Number.isFinite) &&
    box.width >= 0 &&
    box.height >= 0 &&
    (allowEmpty || (box.width > 0 && box.height > 0))
  );
}
export function intersects(a: MapBox, b: MapBox) {
  return a.x <= right(b) && right(a) >= b.x && a.y <= bottom(b) && bottom(a) >= b.y;
}
export function containsBox(outer: MapBox, inner: MapBox) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    right(inner) <= right(outer) &&
    bottom(inner) <= bottom(outer)
  );
}
export function normalizedBox(a: MapPoint, b: MapPoint): MapBox {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}
export function translatedBox(box: MapBox, offset: MapPoint): MapBox {
  return { ...box, x: box.x + offset.x, y: box.y + offset.y };
}
export function worldToMapScreen(point: MapPoint, camera: MapCamera, size: MapSize): MapPoint {
  return {
    x: (point.x - camera.x) * camera.zoom + size.width / 2,
    y: (point.y - camera.y) * camera.zoom + size.height / 2,
  };
}
export function mapScreenToWorld(point: MapPoint, camera: MapCamera, size: MapSize): MapPoint {
  return {
    x: camera.x + (point.x - size.width / 2) / camera.zoom,
    y: camera.y + (point.y - size.height / 2) / camera.zoom,
  };
}
export function viewportBox(camera: MapCamera, size: MapSize): MapBox {
  const origin = mapScreenToWorld({ x: 0, y: 0 }, camera, size);
  return { ...origin, width: size.width / camera.zoom, height: size.height / camera.zoom };
}
export function zoomMapAt(
  camera: MapCamera,
  anchor: MapPoint,
  size: MapSize,
  zoom: number,
): MapCamera {
  if (!Number.isFinite(zoom) || !validBox({ x: 0, y: 0, ...size }))
    throw new RangeError("Invalid zoom/viewport");
  const before = mapScreenToWorld(anchor, camera, size);
  const next = { ...camera, zoom: Math.max(0.05, Math.min(4, zoom)) };
  const after = mapScreenToWorld(anchor, next, size);
  next.x += before.x - after.x;
  next.y += before.y - after.y;
  return next;
}
