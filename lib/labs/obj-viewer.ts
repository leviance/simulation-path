import {
  projectZVertex,
  type ZColor,
  type ZScreenVertex,
  type ZTriangle,
  type ZVec3,
} from "./z-buffer.ts";

export interface ObjLabTriangle {
  indices: [number, number, number];
  sourceFace: number;
  sourceLine: number;
}

export interface ObjLabMesh {
  positions: ZVec3[];
  triangles: ObjLabTriangle[];
  sourceFaceCount: number;
}

export interface ObjLabDiagnostic {
  line: number;
  message: string;
}

export interface ObjLabParseResult {
  mesh: ObjLabMesh;
  diagnostics: ObjLabDiagnostic[];
  lineCount: number;
  ignoredRecordCount: number;
}

export interface ObjLabBounds {
  minimum: ZVec3;
  maximum: ZVec3;
}

export interface ObjSceneTriangle extends ZTriangle {
  sourceFace: number;
  normal: ZVec3;
  intensity: number;
  frontFacing: boolean;
}

export const OBJ_PRESETS = {
  rocket: `# Rocket giản lược
o Rocket
v 0 1.6 0
v -0.7 -0.7 -0.5
v 0.7 -0.7 -0.5
v 0.7 -0.7 0.5
v -0.7 -0.7 0.5
v 0 -1.1 0
f 1 2 3
f 1 3 4
f 1 4 5
f 1 5 2
f 2 5 4 3
f 2 6 3
f 3 6 4
f 4 6 5
f 5 6 2`,
  slash: `# Cùng position, token có UV/normal
v -1 -1 0
v 1 -1 0
v 1 1 0
v -1 1 0
vt 0 1
vt 1 1
vt 1 0
vt 0 0
vn 0 0 -1
f 1/1/1 2/2/1 3/3/1 4/4/1`,
  negative: `# Pentagon dùng index tương đối
v 0 -1 0
v 0.95 -0.3 0
v 0.6 0.9 0
v -0.6 0.9 0
v -0.95 -0.3 0
f -5 -4 -3 -2 -1`,
  malformed: `# Ba lỗi có line rõ ràng
v 0 0 0
v 1 nope 0
f 1 0 2
f 1 2 99`,
} as const;

export type ObjPreset = keyof typeof OBJ_PRESETS;

function add(left: ZVec3, right: ZVec3): ZVec3 {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}

function subtract(left: ZVec3, right: ZVec3): ZVec3 {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}

function scale(value: ZVec3, scalar: number): ZVec3 {
  return { x: value.x * scalar, y: value.y * scalar, z: value.z * scalar };
}

export function objDot(left: ZVec3, right: ZVec3) {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

export function objCross(left: ZVec3, right: ZVec3): ZVec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}

export function objNormalize(value: ZVec3, epsilon = 1e-9): ZVec3 | null {
  const magnitude = Math.sqrt(objDot(value, value));
  if (!Number.isFinite(magnitude) || magnitude <= epsilon) return null;
  return scale(value, 1 / magnitude);
}

export function resolveObjPositionIndex(token: string, positionCount: number) {
  const positionField = token.split("/", 1)[0];
  if (!/^-?\d+$/.test(positionField)) return null;
  const rawIndex = Number(positionField);
  if (!Number.isSafeInteger(rawIndex) || rawIndex === 0) return null;
  const resolved = rawIndex > 0 ? rawIndex - 1 : positionCount + rawIndex;
  if (resolved < 0 || resolved >= positionCount) return null;
  return resolved;
}

export function triangulateObjFace(
  corners: number[],
  sourceFace: number,
  sourceLine: number,
): ObjLabTriangle[] {
  const triangles: ObjLabTriangle[] = [];
  for (let index = 1; index + 1 < corners.length; index += 1) {
    triangles.push({
      indices: [corners[0], corners[index], corners[index + 1]],
      sourceFace,
      sourceLine,
    });
  }
  return triangles;
}

export function parseObjSource(source: string): ObjLabParseResult {
  const positions: ZVec3[] = [];
  const triangles: ObjLabTriangle[] = [];
  const diagnostics: ObjLabDiagnostic[] = [];
  let sourceFaceCount = 0;
  let ignoredRecordCount = 0;
  const lines = source.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const fields = rawLine.split("#", 1)[0].trim().split(/\s+/);
    const keyword = fields[0];
    if (!keyword || keyword.startsWith("#")) return;

    if (keyword === "v") {
      const values = fields.slice(1, 4).map(Number);
      if (values.length !== 3 || values.some((value) => !Number.isFinite(value))) {
        diagnostics.push({ line: lineNumber, message: "record v cần ba tọa độ hữu hạn" });
        return;
      }
      positions.push({ x: values[0], y: values[1], z: values[2] });
      return;
    }

    if (keyword === "f") {
      sourceFaceCount += 1;
      const corners: number[] = [];
      for (const token of fields.slice(1)) {
        const resolved = resolveObjPositionIndex(token, positions.length);
        if (resolved === null) {
          diagnostics.push({
            line: lineNumber,
            message: `face chứa position index không hợp lệ: ${token}`,
          });
          return;
        }
        corners.push(resolved);
      }
      if (corners.length < 3) {
        diagnostics.push({ line: lineNumber, message: "record f cần ít nhất ba corner" });
        return;
      }
      triangles.push(...triangulateObjFace(corners, sourceFaceCount, lineNumber));
      return;
    }

    ignoredRecordCount += 1;
  });

  if (positions.length === 0) {
    diagnostics.push({ line: 0, message: "OBJ không chứa position hợp lệ" });
  }
  return {
    mesh: { positions, triangles, sourceFaceCount },
    diagnostics,
    lineCount: lines.length,
    ignoredRecordCount,
  };
}

export function objMeshBounds(mesh: ObjLabMesh): ObjLabBounds | null {
  if (mesh.positions.length === 0) return null;
  const minimum = { ...mesh.positions[0] };
  const maximum = { ...mesh.positions[0] };
  for (const position of mesh.positions) {
    minimum.x = Math.min(minimum.x, position.x);
    minimum.y = Math.min(minimum.y, position.y);
    minimum.z = Math.min(minimum.z, position.z);
    maximum.x = Math.max(maximum.x, position.x);
    maximum.y = Math.max(maximum.y, position.y);
    maximum.z = Math.max(maximum.z, position.z);
  }
  return { minimum, maximum };
}

export function objBoundsCenter(bounds: ObjLabBounds): ZVec3 {
  return scale(add(bounds.minimum, bounds.maximum), 0.5);
}

export function objBoundsMaxExtent(bounds: ObjLabBounds) {
  const extent = subtract(bounds.maximum, bounds.minimum);
  return Math.max(extent.x, extent.y, extent.z);
}

export function normalizeObjMesh(mesh: ObjLabMesh, targetExtent = 2) {
  const bounds = objMeshBounds(mesh);
  if (!bounds || targetExtent <= 0) return null;
  const maxExtent = objBoundsMaxExtent(bounds);
  if (!Number.isFinite(maxExtent) || maxExtent <= 1e-9) return null;
  const center = objBoundsCenter(bounds);
  const uniformScale = targetExtent / maxExtent;
  return {
    mesh: {
      ...mesh,
      positions: mesh.positions.map((position) => scale(subtract(position, center), uniformScale)),
    },
    center,
    uniformScale,
    before: bounds,
  };
}

function rotateObjPoint(point: ZVec3, angleX: number, angleY: number): ZVec3 {
  const cosineY = Math.cos(angleY);
  const sineY = Math.sin(angleY);
  const afterY = {
    x: point.x * cosineY + point.z * sineY,
    y: point.y,
    z: -point.x * sineY + point.z * cosineY,
  };
  const cosineX = Math.cos(angleX);
  const sineX = Math.sin(angleX);
  return {
    x: afterY.x,
    y: afterY.y * cosineX - afterY.z * sineX,
    z: afterY.y * sineX + afterY.z * cosineX,
  };
}

function shade(base: ZColor, intensity: number): ZColor {
  const safe = Math.max(0, Math.min(1, intensity));
  return {
    red: Math.round(base.red * safe),
    green: Math.round(base.green * safe),
    blue: Math.round(base.blue * safe),
  };
}

export function buildObjScene(
  mesh: ObjLabMesh,
  width: number,
  height: number,
  angleX: number,
  angleY: number,
  cullBackfaces: boolean,
) {
  const cameraPositions = mesh.positions.map((position) => {
    const rotated = rotateObjPoint(position, angleX, angleY);
    return { ...rotated, z: rotated.z + 4.2 };
  });
  const projectedPositions: ZScreenVertex[] = cameraPositions.map((position) =>
    projectZVertex(position, width, height, 0.7, 20),
  );
  const light = objNormalize({ x: -0.45, y: -0.75, z: -1 }) ?? { x: 0, y: 0, z: -1 };
  const base = { red: 92, green: 190, blue: 246 };
  const triangles: ObjSceneTriangle[] = [];

  for (const triangle of mesh.triangles) {
    const a = cameraPositions[triangle.indices[0]];
    const b = cameraPositions[triangle.indices[1]];
    const c = cameraPositions[triangle.indices[2]];
    const normal = objNormalize(objCross(subtract(b, a), subtract(c, a)));
    if (!normal) continue;
    const centroid = scale(add(add(a, b), c), 1 / 3);
    const frontFacing = objDot(normal, centroid) < 0;
    if (cullBackfaces && !frontFacing) continue;
    const intensity = Math.max(0.18, 0.18 + 0.82 * Math.max(0, objDot(normal, light)));
    triangles.push({
      a: projectedPositions[triangle.indices[0]],
      b: projectedPositions[triangle.indices[1]],
      c: projectedPositions[triangle.indices[2]],
      color: shade(base, intensity),
      face: `face ${triangle.sourceFace}`,
      sourceFace: triangle.sourceFace,
      normal,
      intensity,
      frontFacing,
    });
  }
  return { cameraPositions, projectedPositions, triangles };
}
