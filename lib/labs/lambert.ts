export interface LambertVec2 {
  x: number;
  y: number;
}

export interface LambertVec3 {
  x: number;
  y: number;
  z: number;
}

export interface LambertColor {
  red: number;
  green: number;
  blue: number;
}

export interface LambertFace {
  indices: readonly [number, number, number];
  baseColor: LambertColor;
}

export interface LambertMesh {
  vertices: LambertVec3[];
  faces: LambertFace[];
}

export const lambertTetrahedron: LambertMesh = {
  vertices: [
    { x: 1, y: 1, z: 1 },
    { x: -1, y: -1, z: 1 },
    { x: -1, y: 1, z: -1 },
    { x: 1, y: -1, z: -1 },
  ],
  faces: [
    { indices: [1, 2, 3], baseColor: { red: 244, green: 114, blue: 126 } },
    { indices: [0, 3, 2], baseColor: { red: 91, green: 197, blue: 255 } },
    { indices: [0, 1, 3], baseColor: { red: 255, green: 190, blue: 92 } },
    { indices: [0, 2, 1], baseColor: { red: 126, green: 231, blue: 164 } },
  ],
};

export function lambertAdd(left: LambertVec3, right: LambertVec3): LambertVec3 {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}

export function lambertSubtract(left: LambertVec3, right: LambertVec3): LambertVec3 {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}

export function lambertScale(value: LambertVec3, scalar: number): LambertVec3 {
  return { x: value.x * scalar, y: value.y * scalar, z: value.z * scalar };
}

export function lambertDot(left: LambertVec3, right: LambertVec3) {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

export function lambertCross(left: LambertVec3, right: LambertVec3): LambertVec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}

export function lambertLength(value: LambertVec3) {
  return Math.sqrt(lambertDot(value, value));
}

export function lambertNormalize(value: LambertVec3): LambertVec3 {
  const magnitude = lambertLength(value);
  if (magnitude <= 1e-12) return { x: 0, y: 0, z: 0 };
  return lambertScale(value, 1 / magnitude);
}

export function lambertFaceVertices(mesh: LambertMesh, face: LambertFace) {
  return face.indices.map((index) => mesh.vertices[index]) as [
    LambertVec3,
    LambertVec3,
    LambertVec3,
  ];
}

export function lambertFaceCentroid(vertices: readonly LambertVec3[]): LambertVec3 {
  return lambertScale(lambertAdd(lambertAdd(vertices[0], vertices[1]), vertices[2]), 1 / 3);
}

export function lambertFaceNormal(vertices: readonly LambertVec3[]) {
  const edgeAB = lambertSubtract(vertices[1], vertices[0]);
  const edgeAC = lambertSubtract(vertices[2], vertices[0]);
  return lambertNormalize(lambertCross(edgeAB, edgeAC));
}

export function lambertHasOutwardWinding(vertices: readonly LambertVec3[]) {
  return lambertDot(lambertFaceNormal(vertices), lambertFaceCentroid(vertices)) > 0;
}

export function lambertRotateX(point: LambertVec3, angle: number): LambertVec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: point.x,
    y: point.y * cosine - point.z * sine,
    z: point.y * sine + point.z * cosine,
  };
}

export function lambertRotateY(point: LambertVec3, angle: number): LambertVec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: point.x * cosine + point.z * sine,
    y: point.y,
    z: -point.x * sine + point.z * cosine,
  };
}

export function transformLambertMesh(
  mesh: LambertMesh,
  pitch: number,
  yaw: number,
  translation: LambertVec3 = { x: 0, y: 0, z: 5 },
): LambertMesh {
  return {
    vertices: mesh.vertices.map((vertex) =>
      lambertAdd(lambertRotateY(lambertRotateX(vertex, pitch), yaw), translation),
    ),
    faces: mesh.faces,
  };
}

export function lambertIsFrontFacing(vertices: readonly LambertVec3[]) {
  const normal = lambertFaceNormal(vertices);
  const toCamera = lambertNormalize(lambertScale(lambertFaceCentroid(vertices), -1));
  return lambertDot(normal, toCamera) > 0;
}

export function lambertLightingSample(
  normal: LambertVec3,
  surfaceToLight: LambertVec3,
  ambient: number,
  diffuseStrength: number,
) {
  const dotValue = lambertDot(lambertNormalize(normal), lambertNormalize(surfaceToLight));
  const diffuse = Math.max(0, dotValue);
  const intensity = Math.max(0, Math.min(1, ambient + diffuseStrength * diffuse));
  return { dotValue, diffuse, intensity };
}

export function shadeLambertColor(color: LambertColor, intensity: number): LambertColor {
  return {
    red: Math.max(0, Math.min(255, color.red * intensity)),
    green: Math.max(0, Math.min(255, color.green * intensity)),
    blue: Math.max(0, Math.min(255, color.blue * intensity)),
  };
}

export function projectLambertVertex(
  vertex: LambertVec3,
  width: number,
  height: number,
  verticalFov = (60 * Math.PI) / 180,
): LambertVec2 | undefined {
  if (vertex.z < 1 || width <= 0 || height <= 0) return undefined;
  const aspect = width / height;
  const focalScale = 1 / Math.tan(verticalFov * 0.5);
  const ndcX = (vertex.x * focalScale) / (aspect * vertex.z);
  const ndcY = (vertex.y * focalScale) / vertex.z;
  return { x: (ndcX * 0.5 + 0.5) * width, y: (0.5 - ndcY * 0.5) * height };
}
