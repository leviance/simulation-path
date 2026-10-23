import type { ZTriangle, ZVec3 } from "./z-buffer.ts";
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
  sourceTriangle: number;
  normal: ZVec3;
  intensity: number;
  frontFacing: boolean;
}
