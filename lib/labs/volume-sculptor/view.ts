import type { Vec3 } from "../normal.ts";
import { defaultCamera, type Camera } from "../shared/orthographic-camera.ts";
import { clamp, type GridSpec } from "./grid.ts";
import type { Brush } from "./brush.ts";

export const volumeModes = [
  "tetra",
  "cells",
  "normals",
  "brush",
  "stroke",
  "field",
  "prefix",
  "mesh",
  "dirty",
  "slice",
  "archive",
  "validation",
] as const;
export type VolumeMode = (typeof volumeModes)[number];
export type SliceAxis = "X" | "Y" | "Z";
export interface SliceState {
  axis: SliceAxis;
  layer: number;
  u: number;
  v: number;
}
export interface VolumeView {
  camera: Camera;
  slice: SliceState;
  brush: Omit<Brush, "center">;
  wireframe: boolean;
  normals: boolean;
  chunkBoxes: boolean;
  selectedChunk: number;
  inspect: boolean;
}

export function volumeMode(value: string | undefined): VolumeMode {
  return volumeModes.find((mode) => mode === value) ?? "validation";
}

export function initialView(mode: VolumeMode): VolumeView {
  return {
    camera: { ...defaultCamera(), target: { x: 0, y: 0.05, z: 0 }, zoom: 1.55 },
    slice: { axis: "Z", layer: 0.5, u: 0.5, v: 0.5 },
    brush: { radius: 0.35, strength: 0.35, mode: "subtract" },
    wireframe: mode === "cells" || mode === "mesh",
    normals: mode === "normals",
    chunkBoxes: mode === "dirty",
    selectedChunk: 0,
    inspect: mode === "prefix" || mode === "dirty",
  };
}

export function slicePoint(spec: GridSpec, slice: SliceState): Vec3 {
  const u = clamp(slice.u, 0, 1),
    v = clamp(slice.v, 0, 1),
    layer = clamp(slice.layer, 0, 1);
  let coordinate: Vec3 = { x: u, y: v, z: layer };
  if (slice.axis === "X") coordinate = { x: layer, y: u, z: v };
  if (slice.axis === "Y") coordinate = { x: v, y: layer, z: u };
  return spec.worldFromGrid({
    x: coordinate.x * (spec.samples - 1),
    y: coordinate.y * (spec.samples - 1),
    z: coordinate.z * (spec.samples - 1),
  });
}

export function moveProbe(slice: SliceState, dx: number, dy: number, samples: number): SliceState {
  return {
    ...slice,
    u: clamp(slice.u + dx / (samples - 1), 0, 1),
    v: clamp(slice.v + dy / (samples - 1), 0, 1),
  };
}

export const modeQuestions: Record<VolumeMode, string> = {
  tetra: "Bốn giá trị ở đỉnh quyết định mặt cắt ra sao? Đổi một dấu rồi dự đoán số triangle.",
  cells: "Vì sao các cell phải dùng cùng đường chéo? Quan sát wireframe và so samples với cells.",
  normals: "Cùng một geometry, face normal và gradient normal làm ánh sáng khác nhau thế nào?",
  brush: "Cọ phải sửa scalar nào? Đặt probe trên lát cắt rồi thêm hoặc bớt vật liệu.",
  stroke: "Một lần kéo gồm nhiều stamp nhưng vì sao Undo chỉ cần một lần?",
  field: "Field đã đổi nhưng mesh chưa xong: lát cắt và nhãn last-good cho biết điều gì?",
  prefix: "Từng cell cần bao nhiêu vertices? Pause rồi chạy một batch để theo dõi count và offset.",
  mesh: "Vì sao count phải xong trước emit? Thử capacity thấp để thấy mesh cũ được giữ.",
  dirty: "Một nét cọ làm đổi những chunk nào? Đổi camera rồi kiểm tra generation không tăng.",
  slice: "Isovalue đổi bề mặt mà không ghi scalar; giảm rồi tăng N có lấy lại chi tiết không?",
  archive: "Bản lưu có bị thay theo những lần nặn sau đó không? Thử snapshot RAM và khôi phục.",
  validation: "Khoét lỗ hoặc nối hai khối bằng cọ thật, rồi dùng lát cắt và Undo để kiểm tra.",
};
