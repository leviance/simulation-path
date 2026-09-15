export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec4 extends Vec3 {
  w: number;
}

export interface Rgb {
  red: number;
  green: number;
  blue: number;
}

export interface CubeVertex {
  position: Vec3;
  color: Rgb;
}

export interface CubeMesh {
  vertices: CubeVertex[];
  indices: number[];
}

export interface CubeSceneState {
  angleX: number;
  angleY: number;
  depthEnabled: boolean;
  cullingEnabled: boolean;
}

export type RendererKind = "cpu" | "gpu";
export type Mat4 = readonly number[];

export interface ProjectedVertex {
  screenX: number;
  screenY: number;
  depth: number;
  clipW: number;
  color: Rgb;
}

export interface CubeTriangle {
  vertices: [ProjectedVertex, ProjectedVertex, ProjectedVertex];
  faceIndex: number;
  color: Rgb;
  frontFacing: boolean;
}

export interface CubeFrame {
  width: number;
  height: number;
  colors: Uint32Array;
  depths: Float64Array;
  submittedTriangles: number;
  culledTriangles: number;
  passedFragments: number;
  rejectedFragments: number;
}

export interface VertexTrace {
  local: Vec3;
  clip: Vec4;
  ndc: Vec3;
  screen: Vec3;
}

export const defaultCubeScene: CubeSceneState = {
  angleX: -0.42,
  angleY: 0.68,
  depthEnabled: true,
  cullingEnabled: true,
};

const CLEAR_COLOR = 0x0d1526ff;

const faceDefinitions: ReadonlyArray<{
  corners: readonly Vec3[];
  color: Rgb;
}> = [
  {
    corners: [
      { x: -1, y: -1, z: 1 },
      { x: 1, y: -1, z: 1 },
      { x: 1, y: 1, z: 1 },
      { x: -1, y: 1, z: 1 },
    ],
    color: { red: 239, green: 90, blue: 102 },
  },
  {
    corners: [
      { x: 1, y: -1, z: -1 },
      { x: -1, y: -1, z: -1 },
      { x: -1, y: 1, z: -1 },
      { x: 1, y: 1, z: -1 },
    ],
    color: { red: 92, green: 140, blue: 246 },
  },
  {
    corners: [
      { x: -1, y: -1, z: -1 },
      { x: -1, y: -1, z: 1 },
      { x: -1, y: 1, z: 1 },
      { x: -1, y: 1, z: -1 },
    ],
    color: { red: 169, green: 112, blue: 232 },
  },
  {
    corners: [
      { x: 1, y: -1, z: 1 },
      { x: 1, y: -1, z: -1 },
      { x: 1, y: 1, z: -1 },
      { x: 1, y: 1, z: 1 },
    ],
    color: { red: 74, green: 214, blue: 166 },
  },
  {
    corners: [
      { x: -1, y: 1, z: 1 },
      { x: 1, y: 1, z: 1 },
      { x: 1, y: 1, z: -1 },
      { x: -1, y: 1, z: -1 },
    ],
    color: { red: 246, green: 184, blue: 72 },
  },
  {
    corners: [
      { x: -1, y: -1, z: -1 },
      { x: 1, y: -1, z: -1 },
      { x: 1, y: -1, z: 1 },
      { x: -1, y: -1, z: 1 },
    ],
    color: { red: 55, green: 190, blue: 220 },
  },
];

export function makeIndexedCube(): CubeMesh {
  const vertices: CubeVertex[] = [];
  const indices: number[] = [];
  faceDefinitions.forEach((face) => {
    const base = vertices.length;
    face.corners.forEach((position) => {
      vertices.push({ position: { ...position }, color: { ...face.color } });
    });
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  return { vertices, indices };
}

export function identityMatrix(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function multiplyMatrices(left: Mat4, right: Mat4): number[] {
  const result = Array.from({ length: 16 }, () => 0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let value = 0;
      for (let inner = 0; inner < 4; inner += 1) {
        value += left[inner * 4 + row] * right[column * 4 + inner];
      }
      result[column * 4 + row] = value;
    }
  }
  return result;
}

export function transformVector(matrix: Mat4, vector: Vec4): Vec4 {
  return {
    x: matrix[0] * vector.x + matrix[4] * vector.y + matrix[8] * vector.z + matrix[12] * vector.w,
    y: matrix[1] * vector.x + matrix[5] * vector.y + matrix[9] * vector.z + matrix[13] * vector.w,
    z: matrix[2] * vector.x + matrix[6] * vector.y + matrix[10] * vector.z + matrix[14] * vector.w,
    w: matrix[3] * vector.x + matrix[7] * vector.y + matrix[11] * vector.z + matrix[15] * vector.w,
  };
}

export function rotationXMatrix(angle: number): number[] {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [1, 0, 0, 0, 0, cosine, sine, 0, 0, -sine, cosine, 0, 0, 0, 0, 1];
}

export function rotationYMatrix(angle: number): number[] {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [cosine, 0, -sine, 0, 0, 1, 0, 0, sine, 0, cosine, 0, 0, 0, 0, 1];
}

export function translationMatrix(x: number, y: number, z: number): number[] {
  const result = identityMatrix();
  result[12] = x;
  result[13] = y;
  result[14] = z;
  return result;
}

export function perspectiveMatrix(
  verticalFovRadians: number,
  aspect: number,
  nearPlane: number,
  farPlane: number,
): number[] {
  const focalScale = 1 / Math.tan(verticalFovRadians * 0.5);
  const depthScale = (farPlane + nearPlane) / (nearPlane - farPlane);
  const depthTranslation = (2 * farPlane * nearPlane) / (nearPlane - farPlane);
  return [
    focalScale / aspect,
    0,
    0,
    0,
    0,
    focalScale,
    0,
    0,
    0,
    0,
    depthScale,
    -1,
    0,
    0,
    depthTranslation,
    0,
  ];
}

export function makeMvp(state: CubeSceneState, aspect: number): number[] {
  const model = multiplyMatrices(rotationYMatrix(state.angleY), rotationXMatrix(state.angleX));
  const view = translationMatrix(0, 0, -4.2);
  const projection = perspectiveMatrix(Math.PI / 3, aspect, 0.5, 20);
  return multiplyMatrices(projection, multiplyMatrices(view, model));
}

export function traceCubeVertex(
  vertex: CubeVertex,
  mvp: Mat4,
  width: number,
  height: number,
): VertexTrace {
  const local = { ...vertex.position };
  const clip = transformVector(mvp, { ...local, w: 1 });
  const ndc = {
    x: clip.x / clip.w,
    y: clip.y / clip.w,
    z: clip.z / clip.w,
  };
  return {
    local,
    clip,
    ndc,
    screen: {
      x: (ndc.x * 0.5 + 0.5) * width,
      y: (1 - (ndc.y * 0.5 + 0.5)) * height,
      z: ndc.z * 0.5 + 0.5,
    },
  };
}

function signedArea(a: ProjectedVertex, b: ProjectedVertex, c: ProjectedVertex) {
  return (
    (b.screenX - a.screenX) * (c.screenY - a.screenY) -
    (b.screenY - a.screenY) * (c.screenX - a.screenX)
  );
}

export function buildCubeTriangles(
  mesh: CubeMesh,
  state: CubeSceneState,
  width: number,
  height: number,
): CubeTriangle[] {
  const mvp = makeMvp(state, width / height);
  const projected = mesh.vertices.map((vertex) => {
    const trace = traceCubeVertex(vertex, mvp, width, height);
    return {
      screenX: trace.screen.x,
      screenY: trace.screen.y,
      depth: trace.screen.z,
      clipW: trace.clip.w,
      color: { ...vertex.color },
    } satisfies ProjectedVertex;
  });
  const triangles: CubeTriangle[] = [];
  for (let offset = 0; offset < mesh.indices.length; offset += 3) {
    const vertices = [
      projected[mesh.indices[offset]],
      projected[mesh.indices[offset + 1]],
      projected[mesh.indices[offset + 2]],
    ] as [ProjectedVertex, ProjectedVertex, ProjectedVertex];
    triangles.push({
      vertices,
      faceIndex: Math.floor(offset / 6),
      color: { ...vertices[0].color },
      frontFacing: signedArea(vertices[0], vertices[1], vertices[2]) < -1e-9,
    });
  }
  return triangles;
}

function edge(a: ProjectedVertex, b: ProjectedVertex, x: number, y: number) {
  return (b.screenX - a.screenX) * (y - a.screenY) - (b.screenY - a.screenY) * (x - a.screenX);
}

function packedColor(color: Rgb) {
  return (
    ((color.red & 0xff) << 24) | ((color.green & 0xff) << 16) | ((color.blue & 0xff) << 8) | 0xff
  );
}

export function renderCubeContract(
  width: number,
  height: number,
  state: CubeSceneState,
  reverseOrder = false,
): CubeFrame {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const mesh = makeIndexedCube();
  const source = buildCubeTriangles(mesh, state, safeWidth, safeHeight);
  const triangles = reverseOrder ? [...source].reverse() : source;
  const colors = new Uint32Array(safeWidth * safeHeight);
  colors.fill(CLEAR_COLOR);
  const depths = new Float64Array(safeWidth * safeHeight);
  depths.fill(1);
  let culledTriangles = 0;
  let passedFragments = 0;
  let rejectedFragments = 0;

  triangles.forEach((triangle) => {
    if (state.cullingEnabled && !triangle.frontFacing) {
      culledTriangles += 1;
      return;
    }
    const a = triangle.vertices[0];
    let b = triangle.vertices[1];
    let c = triangle.vertices[2];
    let area = signedArea(a, b, c);
    if (Math.abs(area) <= 1e-9) return;
    if (area < 0) {
      [b, c] = [c, b];
      area = -area;
    }
    const minX = Math.max(0, Math.floor(Math.min(a.screenX, b.screenX, c.screenX)));
    const minY = Math.max(0, Math.floor(Math.min(a.screenY, b.screenY, c.screenY)));
    const maxX = Math.min(safeWidth - 1, Math.ceil(Math.max(a.screenX, b.screenX, c.screenX)) - 1);
    const maxY = Math.min(safeHeight - 1, Math.ceil(Math.max(a.screenY, b.screenY, c.screenY)) - 1);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const sampleX = x + 0.5;
        const sampleY = y + 0.5;
        const weightA = edge(b, c, sampleX, sampleY) / area;
        const weightB = edge(c, a, sampleX, sampleY) / area;
        const weightC = edge(a, b, sampleX, sampleY) / area;
        if (weightA < -1e-9 || weightB < -1e-9 || weightC < -1e-9) continue;
        const depth = weightA * a.depth + weightB * b.depth + weightC * c.depth;
        const index = y * safeWidth + x;
        if (state.depthEnabled && depth >= depths[index]) {
          rejectedFragments += 1;
          continue;
        }
        depths[index] = depth;
        colors[index] = packedColor(triangle.color);
        passedFragments += 1;
      }
    }
  });
  return {
    width: safeWidth,
    height: safeHeight,
    colors,
    depths,
    submittedTriangles: triangles.length,
    culledTriangles,
    passedFragments,
    rejectedFragments,
  };
}

interface GpuReferenceVertex {
  windowX: number;
  windowY: number;
  depth: number;
  color: Rgb;
}

function gpuSignedArea(a: GpuReferenceVertex, b: GpuReferenceVertex, c: GpuReferenceVertex) {
  return (
    (b.windowX - a.windowX) * (c.windowY - a.windowY) -
    (b.windowY - a.windowY) * (c.windowX - a.windowX)
  );
}

function gpuEdge(a: GpuReferenceVertex, b: GpuReferenceVertex, windowX: number, windowY: number) {
  return (
    (b.windowX - a.windowX) * (windowY - a.windowY) -
    (b.windowY - a.windowY) * (windowX - a.windowX)
  );
}

// Independent reference for the OpenGL convention: the viewport origin is
// bottom-left and CCW has positive signed area before the framebuffer is
// converted back to row-major top-left storage for comparison with the CPU path.
export function renderGpuReferenceContract(
  width: number,
  height: number,
  state: CubeSceneState,
  reverseOrder = false,
): CubeFrame {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const localMesh = makeIndexedCube();
  const mvp = makeMvp(state, safeWidth / safeHeight);
  const projected = localMesh.vertices.map((vertex) => {
    const clip = transformVector(mvp, {
      x: vertex.position.x,
      y: vertex.position.y,
      z: vertex.position.z,
      w: 1,
    });
    const ndcX = clip.x / clip.w;
    const ndcY = clip.y / clip.w;
    const ndcZ = clip.z / clip.w;
    return {
      windowX: (ndcX * 0.5 + 0.5) * safeWidth,
      windowY: (ndcY * 0.5 + 0.5) * safeHeight,
      depth: ndcZ * 0.5 + 0.5,
      color: { ...vertex.color },
    } satisfies GpuReferenceVertex;
  });

  const triangleOffsets = Array.from(
    { length: localMesh.indices.length / 3 },
    (_, index) => index * 3,
  );
  if (reverseOrder) triangleOffsets.reverse();

  const colors = new Uint32Array(safeWidth * safeHeight);
  colors.fill(CLEAR_COLOR);
  const depths = new Float64Array(safeWidth * safeHeight);
  depths.fill(1);
  let culledTriangles = 0;
  let passedFragments = 0;
  let rejectedFragments = 0;

  for (const offset of triangleOffsets) {
    const a = projected[localMesh.indices[offset]];
    let b = projected[localMesh.indices[offset + 1]];
    let c = projected[localMesh.indices[offset + 2]];
    let area = gpuSignedArea(a, b, c);
    if (state.cullingEnabled && area <= 1e-9) {
      culledTriangles += 1;
      continue;
    }
    if (Math.abs(area) <= 1e-9) continue;
    if (area < 0) {
      [b, c] = [c, b];
      area = -area;
    }

    const minimumX = Math.max(0, Math.floor(Math.min(a.windowX, b.windowX, c.windowX)));
    const minimumY = Math.max(0, Math.floor(Math.min(a.windowY, b.windowY, c.windowY)));
    const maximumX = Math.min(
      safeWidth - 1,
      Math.ceil(Math.max(a.windowX, b.windowX, c.windowX)) - 1,
    );
    const maximumY = Math.min(
      safeHeight - 1,
      Math.ceil(Math.max(a.windowY, b.windowY, c.windowY)) - 1,
    );
    const color = packedColor(a.color);

    for (let windowY = minimumY; windowY <= maximumY; windowY += 1) {
      for (let windowX = minimumX; windowX <= maximumX; windowX += 1) {
        const sampleX = windowX + 0.5;
        const sampleY = windowY + 0.5;
        const weightA = gpuEdge(b, c, sampleX, sampleY) / area;
        const weightB = gpuEdge(c, a, sampleX, sampleY) / area;
        const weightC = gpuEdge(a, b, sampleX, sampleY) / area;
        if (weightA < -1e-9 || weightB < -1e-9 || weightC < -1e-9) continue;

        const fragmentDepth = weightA * a.depth + weightB * b.depth + weightC * c.depth;
        const topLeftY = safeHeight - 1 - windowY;
        const pixel = topLeftY * safeWidth + windowX;
        if (state.depthEnabled && fragmentDepth >= depths[pixel]) {
          rejectedFragments += 1;
          continue;
        }
        depths[pixel] = fragmentDepth;
        colors[pixel] = color;
        passedFragments += 1;
      }
    }
  }

  return {
    width: safeWidth,
    height: safeHeight,
    colors,
    depths,
    submittedTriangles: triangleOffsets.length,
    culledTriangles,
    passedFragments,
    rejectedFragments,
  };
}

export function compareFrames(first: CubeFrame, second: CubeFrame) {
  let colorPixels = 0;
  let depthPixels = 0;
  for (let index = 0; index < first.colors.length; index += 1) {
    if (first.colors[index] !== second.colors[index]) colorPixels += 1;
    if (Math.abs(first.depths[index] - second.depths[index]) > 1e-9) depthPixels += 1;
  }
  return { colorPixels, depthPixels };
}

export function rendererLabel(renderer: RendererKind) {
  if (renderer === "cpu") return "F1 · CPU rasterizer";
  return "F2 · OpenGL GPU";
}
