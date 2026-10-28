export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface Vec4 extends Vec3 {
  w: number;
}
export interface MeshVertex {
  position: Vec3;
  normal: Vec3;
}
export interface ViewerMesh {
  name: string;
  vertices: MeshVertex[];
  indices: number[];
}
export interface ViewerState {
  angleX: number;
  angleY: number;
  cameraYaw: number;
  cameraPitch: number;
  distance: number;
  cameraDrag: boolean;
  paused: boolean;
  wireframe: boolean;
  normals: boolean;
  cullBackfaces: boolean;
  reverseOrder: boolean;
  grid: boolean;
}
export interface ViewerScene {
  view: ViewerState;
  meshIndex: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  verticalFov: number;
  nearPlane: number;
  farPlane: number;
  depthEnabled: boolean;
  lit: boolean;
  light: Vec3;
  baseColor: Vec3;
}
export type RendererKind = "cpu" | "gpu";
export type Mat4 = readonly number[];
export interface ScreenVertex {
  x: number;
  y: number;
  depth: number;
}
export interface ViewerFrame {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  depth: Float64Array;
  submitted: number;
  culled: number;
  clipped: number;
  passed: number;
  rejected: number;
}
