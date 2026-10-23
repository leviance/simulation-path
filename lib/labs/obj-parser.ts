import type { ZVec3 } from "./z-buffer.ts";
import type {
  ObjLabTriangle,
  ObjLabParseResult,
  ObjLabDiagnostic,
  ObjLabMesh,
} from "./obj-types.ts";
import { objCross, objDot, objNormalize, objSubtract, objAdd } from "./obj-geometry.ts";

// Inspector giữ token thực trong file, kể cả index âm và face được chia bằng fan.
export function objFaceIndexLabels(source: string, mesh: ObjLabMesh, selected: number) {
  const triangle = mesh.triangles[selected];
  if (!triangle) return "—";
  const first = mesh.triangles.findIndex((t) => t.sourceFace === triangle.sourceFace);
  const ordinal = selected - first;
  const fields =
    source.split(/\r?\n/)[triangle.sourceLine - 1]?.split("#")[0].trim().split(/\s+/).slice(1) ??
    [];
  const corners = [fields[0], fields[ordinal + 1], fields[ordinal + 2]];
  return triangle.indices
    .map((index, corner) => `${corners[corner]?.split("/")[0] ?? "?"}→${index}`)
    .join(" · ");
}
export function resolveObjPositionIndex(token: string, positionCount: number, stage = 8) {
  if (stage < 3 && token.includes("/")) return null;
  const fields = token.split("/");
  const integer = (field: string) =>
    /^-?\d+$/.test(field) &&
    Number.isSafeInteger(Number(field)) &&
    Number(field) !== 0 &&
    Number(field) >= -2147483648 &&
    Number(field) <= 2147483647;
  if (fields.length > 3 || !integer(fields[0])) return null;
  if (fields.length === 2 && !integer(fields[1])) return null;
  if (fields.length === 3 && ((fields[1] !== "" && !integer(fields[1])) || !integer(fields[2])))
    return null;
  const positionField = fields[0];
  if (!/^-?\d+$/.test(positionField)) return null;
  const rawIndex = Number(positionField);
  if (stage < 3 && rawIndex < 0) return null;
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

export function convexPlanarObjFace(mesh: ObjLabMesh, corners: number[]) {
  const origin = mesh.positions[corners[0]];
  let area = { x: 0, y: 0, z: 0 };
  let extent = 0;
  for (let i = 0; i < corners.length; i++) {
    const a = objSubtract(mesh.positions[corners[i]], origin);
    const b = objSubtract(mesh.positions[corners[(i + 1) % corners.length]], origin);
    area = objAdd(area, objCross(a, b));
    extent = Math.max(extent, Math.hypot(a.x, a.y, a.z));
  }
  const normal = objNormalize(area, extent * extent * 1e-12);
  if (!normal) return false;
  const tolerance = Math.max(1e-12, extent * 1e-6);
  for (let i = 0; i < corners.length; i++) {
    const a = mesh.positions[corners[i]];
    const b = mesh.positions[corners[(i + 1) % corners.length]];
    const c = mesh.positions[corners[(i + 2) % corners.length]];
    if (
      Math.abs(objDot(objSubtract(a, origin), normal)) > tolerance ||
      objDot(objCross(objSubtract(b, a), objSubtract(c, b)), normal) < -tolerance * extent
    )
      return false;
    for (let j = i + 1; j < corners.length; j++) {
      const delta = objSubtract(a, mesh.positions[corners[j]]);
      if (Math.hypot(delta.x, delta.y, delta.z) < tolerance) return false;
    }
    for (const corner of corners) {
      if (
        objDot(objCross(objSubtract(b, a), objSubtract(mesh.positions[corner], a)), normal) <
        -tolerance * extent
      )
        return false;
    }
  }
  return true;
}

export function parseObjSource(source: string, stage = 8): ObjLabParseResult {
  const positions: ZVec3[] = [];
  const triangles: ObjLabTriangle[] = [];
  const diagnostics: ObjLabDiagnostic[] = [];
  let sourceFaceCount = 0;
  let ignoredRecordCount = 0;
  const lines = source.split(/\r?\n/);

  let bytes = 0;
  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    bytes += rawLine.length + 1;
    if (
      bytes > 8 * 1024 * 1024 ||
      rawLine.length > 16384 ||
      positions.length >= 200000 ||
      triangles.length >= 400000
    ) {
      diagnostics.push({ line: lineNumber, message: "vượt giới hạn kích thước OBJ" });
      break;
    }
    if (diagnostics.length >= 64) break;
    const fields = rawLine.split("#", 1)[0].trim().split(/\s+/);
    const keyword = fields[0];
    if (!keyword || keyword.startsWith("#")) continue;

    if (keyword === "v") {
      const values = fields.slice(1, 4).map(Number);
      const decimal = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
      if (
        fields.length !== 4 ||
        !fields.slice(1).every((value) => decimal.test(value)) ||
        values.length !== 3 ||
        values.some((value) => !Number.isFinite(value) || Math.abs(value) > 1e6)
      ) {
        diagnostics.push({ line: lineNumber, message: "record v cần ba tọa độ hữu hạn" });
        continue;
      }
      positions.push({ x: values[0], y: values[1], z: values[2] });
      continue;
    }

    if (keyword === "f") {
      if (stage < 2) {
        ignoredRecordCount++;
        continue;
      }
      sourceFaceCount += 1;
      const corners: number[] = [];
      let valid = true;
      for (const token of fields.slice(1)) {
        const resolved = resolveObjPositionIndex(token, positions.length, stage);
        if (resolved === null) {
          diagnostics.push({
            line: lineNumber,
            message: `face chứa position index không hợp lệ: ${token}`,
          });
          valid = false;
          break;
        }
        corners.push(resolved);
      }
      if (!valid) continue;
      if (corners.length < 3 || corners.length > 128) {
        diagnostics.push({ line: lineNumber, message: "record f cần ít nhất ba corner" });
        continue;
      }
      if (stage < 4 && corners.length !== 3) {
        diagnostics.push({
          line: lineNumber,
          message: "checkpoint này mới nhận face có đúng ba corner",
        });
        continue;
      }
      if (stage >= 4 && !convexPlanarObjFace({ positions, triangles, sourceFaceCount }, corners)) {
        diagnostics.push({
          line: lineNumber,
          message: "face phải phẳng, lồi và không có corner trùng",
        });
        continue;
      }
      triangles.push(...triangulateObjFace(corners, sourceFaceCount, lineNumber));
      continue;
    }

    if (["vt", "vn", "o", "g", "s", "usemtl", "mtllib"].includes(keyword)) ignoredRecordCount += 1;
    else diagnostics.push({ line: lineNumber, message: `record chưa hỗ trợ: ${keyword}` });
  }

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
