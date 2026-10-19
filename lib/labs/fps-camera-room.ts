import type { Vec3 } from "./normal.ts";
export type RoomLine = { from: Vec3; to: Vec3; color: string };
export const FPS_ROOM = { minX: -6, maxX: 6, floorY: 0, ceilingY: 4, minZ: 0, maxZ: 22 } as const;
export function makeFpsRoom(): RoomLine[] {
  const room: RoomLine[] = [];
  const add = (from: Vec3, to: Vec3, color: string) => room.push({ from, to, color });
  const b = FPS_ROOM;
  for (let x = b.minX; x <= b.maxX; x += 2) add({ x, y: 0, z: 0 }, { x, y: 0, z: 22 }, "#4484ae");
  for (let z = b.minZ; z <= b.maxZ; z += 2) {
    add({ x: -6, y: 0, z }, { x: 6, y: 0, z }, "#4484ae");
    add({ x: -6, y: 0, z }, { x: -6, y: 4, z }, "#7da5ee");
    add({ x: 6, y: 0, z }, { x: 6, y: 4, z }, "#7da5ee");
    add({ x: -6, y: 4, z }, { x: 6, y: 4, z }, "#7570be");
  }
  for (let x = b.minX; x <= b.maxX; x += 2) {
    add({ x, y: 0, z: 0 }, { x, y: 4, z: 0 }, "#7da5ee");
    add({ x, y: 0, z: 22 }, { x, y: 4, z: 22 }, "#7da5ee");
  }
  add({ x: -6, y: 4, z: 0 }, { x: -6, y: 4, z: 22 }, "#7570be");
  add({ x: 6, y: 4, z: 0 }, { x: 6, y: 4, z: 22 }, "#7570be");
  const box = (c: Vec3, h: Vec3, color: string) => {
    const vertices = [
      { x: c.x - h.x, y: c.y - h.y, z: c.z - h.z },
      { x: c.x + h.x, y: c.y - h.y, z: c.z - h.z },
      { x: c.x + h.x, y: c.y + h.y, z: c.z - h.z },
      { x: c.x - h.x, y: c.y + h.y, z: c.z - h.z },
      { x: c.x - h.x, y: c.y - h.y, z: c.z + h.z },
      { x: c.x + h.x, y: c.y - h.y, z: c.z + h.z },
      { x: c.x + h.x, y: c.y + h.y, z: c.z + h.z },
      { x: c.x - h.x, y: c.y + h.y, z: c.z + h.z },
    ];
    for (const [a, b] of [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ])
      add(vertices[a], vertices[b], color);
  };
  box({ x: -3, y: 0.75, z: 8 }, { x: 0.8, y: 0.75, z: 0.8 }, "#ffb454");
  box({ x: 3, y: 1.1, z: 16 }, { x: 1, y: 1.1, z: 1 }, "#53f0ae");
  add({ x: -6, y: 2, z: 22 }, { x: 6, y: 2, z: 22 }, "#ffb454");
  return room;
}
export const FPS_ROOM_GEOMETRY: readonly RoomLine[] = makeFpsRoom();
