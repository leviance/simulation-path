import assert from "node:assert/strict";
import test from "node:test";
import * as math from "../lib/labs/math.ts";
import * as near from "../lib/labs/near-plane.ts";
import * as lambert from "../lib/labs/lambert.ts";

async function loadMath() {
  return math;
}

test("near-plane Canvas math clips all four triangle cases without unsafe vertices", () => {
  const makeVertex = (x, z) => ({
    position: { x, y: x * 0.25, z },
    color: { red: 40 + x * 10, green: 120, blue: 220 },
  });
  const cases = [
    { depths: [2, 2.5, 3], vertices: 3, triangles: 1 },
    { depths: [0.4, 2.5, 3], vertices: 4, triangles: 2 },
    { depths: [0.4, 0.6, 3], vertices: 3, triangles: 1 },
    { depths: [0.2, 0.4, 0.6], vertices: 0, triangles: 0 },
  ];

  for (const sample of cases) {
    const triangle = {
      a: makeVertex(-1, sample.depths[0]),
      b: makeVertex(1, sample.depths[1]),
      c: makeVertex(0, sample.depths[2]),
    };
    const polygon = near.clipNearTriangle(triangle, 1);
    assert.equal(polygon.length, sample.vertices);
    assert.equal(near.triangulateNearPolygon(polygon).length, sample.triangles);
    assert.ok(polygon.every((vertex) => vertex.position.z >= 1 - 1e-9));
    assert.ok(polygon.every((vertex) => Number.isFinite(vertex.color.red)));
  }
});

test("near-plane intersection shares one t across position and color", () => {
  const start = {
    position: { x: -2, y: 1, z: 0.25 },
    color: { red: 20, green: 40, blue: 60 },
  };
  const end = {
    position: { x: 2, y: 3, z: 2.25 },
    color: { red: 100, green: 120, blue: 140 },
  };
  const intersection = near.intersectNearPlane(start, end, 1);
  assert.equal(intersection.t, 0.375);
  assert.equal(intersection.vertex.position.z, 1);
  assert.equal(intersection.vertex.position.x, -0.5);
  assert.equal(intersection.vertex.color.red, 50);
});

test("Lambert Lab keeps winding, lighting and culling conventions aligned with C++", () => {
  for (const face of lambert.lambertTetrahedron.faces) {
    const vertices = lambert.lambertFaceVertices(lambert.lambertTetrahedron, face);
    const normal = lambert.lambertFaceNormal(vertices);
    assert.equal(lambert.lambertHasOutwardWinding(vertices), true);
    assert.ok(Math.abs(lambert.lambertLength(normal) - 1) < 1e-12);
    assert.ok(
      Math.abs(lambert.lambertDot(normal, lambert.lambertSubtract(vertices[1], vertices[0]))) <
        1e-12,
    );
  }

  const front = { x: 0, y: 0, z: -1 };
  assert.deepEqual(lambert.lambertLightingSample(front, front, 0.2, 0.8), {
    dotValue: 1,
    diffuse: 1,
    intensity: 1,
  });
  assert.deepEqual(lambert.lambertLightingSample({ x: 0, y: 0, z: 1 }, front, 0.2, 0.8), {
    dotValue: -1,
    diffuse: 0,
    intensity: 0.2,
  });

  const cameraMesh = lambert.transformLambertMesh(lambert.lambertTetrahedron, 0.35, -0.55);
  const visible = cameraMesh.faces.filter((face) =>
    lambert.lambertIsFrontFacing(lambert.lambertFaceVertices(cameraMesh, face)),
  );
  assert.ok(visible.length > 0 && visible.length < 4);
  assert.ok(lambert.projectLambertVertex(cameraMesh.vertices[0], 640, 480));
});

test("Canvas math rounds halfway values like std::lround", async () => {
  const { roundLikeCpp } = await loadMath();
  assert.equal(roundLikeCpp(0.5), 1);
  assert.equal(roundLikeCpp(-0.5), -1);
  assert.equal(roundLikeCpp(1.49), 1);
  assert.equal(roundLikeCpp(-1.49), -1);
});

test("DDA keeps both endpoints and matches C++ rounding for negative values", async () => {
  const { ddaSteps } = await loadMath();
  const steps = ddaSteps({ x: 0, y: -1 }, { x: 2, y: 0 });

  assert.deepEqual(
    steps.map((step) => step.point),
    [
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: 2, y: 0 },
    ],
  );
});

test("Bresenham includes endpoints and stays connected in all eight octants", async () => {
  const { bresenhamSteps } = await loadMath();
  const endpoints = [
    { x: 7, y: 3 },
    { x: 3, y: 7 },
    { x: -3, y: 7 },
    { x: -7, y: 3 },
    { x: -7, y: -3 },
    { x: -3, y: -7 },
    { x: 3, y: -7 },
    { x: 7, y: -3 },
  ];

  for (const end of endpoints) {
    const steps = bresenhamSteps({ x: 0, y: 0 }, end);
    assert.deepEqual(steps[0].point, { x: 0, y: 0 });
    assert.deepEqual(steps.at(-1).point, end);

    for (let index = 1; index < steps.length; index += 1) {
      const dx = Math.abs(steps[index].point.x - steps[index - 1].point.x);
      const dy = Math.abs(steps[index].point.y - steps[index - 1].point.y);
      assert.equal(Math.max(dx, dy), 1, `Disconnected step on line to (${end.x}, ${end.y})`);
    }
  }
});

test("rectangle pixels use inclusive bounds and ignore corner order", async () => {
  const { rectanglePixels } = await loadMath();
  const first = { x: 4, y: 3 };
  const second = { x: 1, y: 1 };
  const outline = rectanglePixels(first, second, false);
  const filled = rectanglePixels(first, second, true);

  assert.equal(outline.length, 10);
  assert.equal(filled.length, 12);
  assert.deepEqual(outline, rectanglePixels(second, first, false));
  assert.deepEqual(rectanglePixels({ x: 2, y: 2 }, { x: 2, y: 2 }, false), [{ x: 2, y: 2 }]);
});

test("midpoint circle exposes the same decisions as C++ and stays near its radius", async () => {
  const { midpointCircle, midpointCircleSteps } = await loadMath();
  const steps = midpointCircleSteps({ x: 0, y: 0 }, 5);
  const points = midpointCircle({ x: 0, y: 0 }, 5);

  assert.deepEqual(
    steps.map(({ x, y, decision }) => ({ x, y, decision })),
    [
      { x: 5, y: 0, decision: -4 },
      { x: 5, y: 1, decision: -1 },
      { x: 5, y: 2, decision: 4 },
      { x: 4, y: 3, decision: 3 },
    ],
  );
  for (const cardinal of [
    { x: 5, y: 0 },
    { x: -5, y: 0 },
    { x: 0, y: 5 },
    { x: 0, y: -5 },
  ]) {
    assert.ok(points.some((point) => point.x === cardinal.x && point.y === cardinal.y));
  }
  assert.equal(new Set(points.map((point) => `${point.x},${point.y}`)).size, points.length);
  for (const point of points) {
    assert.ok(Math.abs(Math.hypot(point.x, point.y) - 5) <= 0.55);
  }
});

test("stroke interpolation preserves endpoints and limits the stamp gap", async () => {
  const { interpolateStroke } = await loadMath();
  const input = [
    { x: 2, y: 3 },
    { x: 29, y: 3 },
    { x: 29, y: 18 },
  ];
  const spacing = 6;
  const stamps = interpolateStroke(input, spacing);

  assert.deepEqual(stamps[0], input[0]);
  assert.deepEqual(stamps.at(-1), input.at(-1));
  for (let index = 1; index < stamps.length; index += 1) {
    assert.ok(
      Math.hypot(stamps[index].x - stamps[index - 1].x, stamps[index].y - stamps[index - 1].y) <=
        spacing,
      "Interpolation left a gap larger than the requested spacing",
    );
  }
});

test("coordinate transforms round-trip and cursor-anchored zoom preserves its world point", async () => {
  const { screenToWorld, worldToScreen, zoomCameraAt } = await loadMath();
  const size = { width: 840, height: 420 };
  const camera = { x: 2.5, y: -1.25, zoom: 55 };
  const screen = { x: 619.25, y: 117.75 };
  const world = screenToWorld(screen, camera, size);
  const restored = worldToScreen(world, camera, size);

  assert.ok(Math.hypot(restored.x - screen.x, restored.y - screen.y) < 1e-9);

  const zoomed = zoomCameraAt(camera, screen, 1.12, size);
  const worldAfterZoom = screenToWorld(screen, zoomed.camera, size);
  assert.ok(Math.hypot(worldAfterZoom.x - world.x, worldAfterZoom.y - world.y) < 1e-9);
  assert.ok(zoomed.anchorError < 1e-9);
});

test("Vector Lab matches the C++ vector formulas and handles the zero vector", async () => {
  const { add, subtract, scale, length, normalize, distance, lerp } = await loadMath();
  const a = { x: 3, y: 4 };
  const b = { x: -2, y: 5 };

  assert.deepEqual(add(a, b), { x: 1, y: 9 });
  assert.deepEqual(subtract(a, b), { x: 5, y: -1 });
  assert.deepEqual(scale(a, 2), { x: 6, y: 8 });
  assert.equal(length(a), 5);
  assert.ok(Math.abs(length(normalize(a)) - 1) < 1e-12);
  assert.deepEqual(normalize({ x: 0, y: 0 }), { x: 0, y: 0 });
  assert.ok(Math.abs(distance(a, b) - Math.sqrt(26)) < 1e-12);
  assert.deepEqual(lerp(a, b, 0.5), { x: 0.5, y: 4.5 });
});

test("Unit Circle Lab normalizes angles and round-trips direction through atan2", async () => {
  const {
    TAU,
    normalizeAngle,
    pointOnUnitCircle,
    angleFromPoint,
    projectOntoXAxis,
    projectOntoYAxis,
    mapSampleTimeToX,
  } = await loadMath();

  assert.ok(Math.abs(normalizeAngle(-Math.PI / 2) - (3 * Math.PI) / 2) < 1e-12);
  assert.equal(normalizeAngle(TAU), 0);
  assert.equal(normalizeAngle(Number.POSITIVE_INFINITY), 0);

  for (let step = 0; step < 24; step += 1) {
    const angle = (TAU * step) / 24;
    const point = pointOnUnitCircle(angle);
    assert.ok(Math.abs(point.x * point.x + point.y * point.y - 1) < 1e-12);
    assert.ok(Math.abs(angleFromPoint(point) - angle) < 1e-12);
  }
  assert.equal(angleFromPoint({ x: 0, y: 0 }), 0);
  assert.deepEqual(projectOntoXAxis({ x: 3, y: 4 }), { x: 3, y: 0 });
  assert.deepEqual(projectOntoYAxis({ x: 3, y: 4 }), { x: 0, y: 4 });
  assert.equal(mapSampleTimeToX(0, 6, 6, 100, 700), 100);
  assert.equal(mapSampleTimeToX(3, 6, 6, 100, 700), 400);
  assert.equal(mapSampleTimeToX(6, 6, 6, 100, 700), 700);
});

test("Turret Lab mirrors dot, angle, projection and rotation formulas from C++", async () => {
  const {
    add,
    angleBetween,
    cosineBetween,
    crossZ,
    dot,
    isWithinViewCone,
    pointOnUnitCircle,
    rejection,
    rotateTowards,
    scalarProjection,
    signedAngleBetween,
    vectorProjection,
  } = await loadMath();

  assert.equal(dot({ x: 2, y: 0 }, { x: 3, y: 0 }), 6);
  assert.equal(cosineBetween({ x: 2, y: 0 }, { x: 8, y: 0 }), 1);
  assert.ok(Math.abs(angleBetween({ x: 1, y: 0 }, { x: 0, y: 1 }) - Math.PI / 2) < 1e-12);

  const projected = vectorProjection({ x: 3, y: 4 }, { x: 1, y: 0 });
  const rejected = rejection({ x: 3, y: 4 }, { x: 1, y: 0 });
  assert.equal(scalarProjection({ x: 3, y: 4 }, { x: 1, y: 0 }), 3);
  assert.deepEqual(projected, { x: 3, y: 0 });
  assert.deepEqual(rejected, { x: 0, y: 4 });
  assert.deepEqual(add(projected, rejected), { x: 3, y: 4 });
  assert.equal(dot(projected, rejected), 0);

  assert.ok(crossZ({ x: 1, y: 0 }, { x: 0, y: 1 }) > 0);
  assert.ok(signedAngleBetween({ x: 1, y: 0 }, { x: 0, y: -1 }) < 0);
  assert.ok(Math.abs(rotateTowards(0, { x: 0, y: 1 }, 0.25) - 0.25) < 1e-12);
  assert.ok(Math.abs(rotateTowards(0.25, pointOnUnitCircle(0.3), 0.25) - 0.3) < 1e-12);

  assert.equal(
    isWithinViewCone({ x: 1, y: 0 }, pointOnUnitCircle((20 * Math.PI) / 180), (30 * Math.PI) / 180),
    true,
  );
  assert.equal(
    isWithinViewCone({ x: 1, y: 0 }, pointOnUnitCircle((40 * Math.PI) / 180), (30 * Math.PI) / 180),
    false,
  );
  assert.equal(isWithinViewCone({ x: 1, y: 0 }, { x: 0, y: 0 }, (30 * Math.PI) / 180), false);
});

test("Transform Lab matches component formulas, matrix order and determinant area", async () => {
  const {
    add,
    composeTransform,
    determinantLinearPart,
    polygonArea,
    rotatePoint,
    scalePoint,
    shearPoint,
    transformPoint,
  } = await loadMath();

  assert.deepEqual(scalePoint({ x: 4, y: -2 }, 2, 3), { x: 8, y: -6 });
  const quarterTurn = rotatePoint({ x: 1, y: 0 }, Math.PI / 2);
  assert.ok(Math.hypot(quarterTurn.x, quarterTurn.y - 1) < 1e-12);
  assert.deepEqual(shearPoint({ x: 2, y: 4 }, 0.5, 0), { x: 4, y: 4 });
  assert.deepEqual(shearPoint({ x: 2, y: 4 }, 0, -0.25), { x: 2, y: 3.5 });

  const parameters = {
    scaleX: 1.5,
    scaleY: 0.75,
    angle: 0.6,
    shearX: 0.35,
    shearY: -0.1,
    translation: { x: 12, y: -8 },
  };
  const point = { x: 2, y: -1 };
  const scaled = scalePoint(point, parameters.scaleX, parameters.scaleY);
  const sheared = shearPoint(scaled, parameters.shearX, parameters.shearY);
  const direct = add(rotatePoint(sheared, parameters.angle), parameters.translation);
  const scaleFirst = composeTransform(parameters, "scale-shear-rotate");
  const rotateFirst = composeTransform(parameters, "rotate-shear-scale");
  const matrixResult = transformPoint(scaleFirst, point);
  assert.ok(Math.hypot(matrixResult.x - direct.x, matrixResult.y - direct.y) < 1e-12);
  assert.ok(
    Math.hypot(
      matrixResult.x - transformPoint(rotateFirst, point).x,
      matrixResult.y - transformPoint(rotateFirst, point).y,
    ) > 1e-6,
  );

  const square = [
    { x: -2, y: -2 },
    { x: 2, y: -2 },
    { x: 2, y: 2 },
    { x: -2, y: 2 },
  ];
  const transformed = square.map((vertex) => transformPoint(scaleFirst, vertex));
  const areaRatio = polygonArea(transformed) / polygonArea(square);
  assert.ok(Math.abs(areaRatio - Math.abs(determinantLinearPart(scaleFirst))) < 1e-12);
});

test("Normal Lab matches Vec3, cross, winding and degenerate formulas", async () => {
  const {
    cross3,
    dot3,
    facingAmount,
    isDegenerateTriangle,
    magnitude3,
    orthogonalityError,
    projectIsometric,
    reverseWinding,
    scale3,
    triangleArea,
    triangleEdges,
    triangleRawNormal,
    triangleUnitNormal,
  } = await loadMath();

  const xAxis = { x: 1, y: 0, z: 0 };
  const yAxis = { x: 0, y: 1, z: 0 };
  const zAxis = { x: 0, y: 0, z: 1 };
  assert.deepEqual(cross3(xAxis, yAxis), zAxis);
  const reverseBasis = cross3(yAxis, xAxis);
  const negativeZ = scale3(zAxis, -1);
  assert.ok(
    Math.hypot(
      reverseBasis.x - negativeZ.x,
      reverseBasis.y - negativeZ.y,
      reverseBasis.z - negativeZ.z,
    ) < 1e-12,
  );

  const triangle = {
    a: { x: 0, y: 0, z: 0 },
    b: { x: 3, y: 0, z: 0 },
    c: { x: 0, y: 4, z: 0 },
  };
  const { ab, ac } = triangleEdges(triangle);
  const rawNormal = triangleRawNormal(triangle);
  assert.deepEqual(ab, { x: 3, y: 0, z: 0 });
  assert.deepEqual(ac, { x: 0, y: 4, z: 0 });
  assert.deepEqual(rawNormal, { x: 0, y: 0, z: 12 });
  assert.equal(dot3(rawNormal, ab), 0);
  assert.equal(dot3(rawNormal, ac), 0);
  assert.equal(magnitude3(triangleUnitNormal(triangle)), 1);
  assert.equal(triangleArea(triangle), 6);
  assert.equal(orthogonalityError(triangle), 0);

  const reversed = reverseWinding(triangle);
  const reversedNormal = triangleRawNormal(reversed);
  const expectedReversedNormal = scale3(rawNormal, -1);
  assert.ok(
    Math.hypot(
      reversedNormal.x - expectedReversedNormal.x,
      reversedNormal.y - expectedReversedNormal.y,
      reversedNormal.z - expectedReversedNormal.z,
    ) < 1e-12,
  );
  assert.equal(triangleArea(reversed), triangleArea(triangle));
  assert.equal(
    Math.sign(facingAmount(reversed, { x: 1, y: -1, z: 1 })),
    -Math.sign(facingAmount(triangle, { x: 1, y: -1, z: 1 })),
  );

  const collinear = {
    a: { x: -1, y: -1, z: -1 },
    b: { x: 0, y: 0, z: 0 },
    c: { x: 2, y: 2, z: 2 },
  };
  assert.equal(isDegenerateTriangle(collinear), true);
  assert.deepEqual(triangleUnitNormal(collinear), { x: 0, y: 0, z: 0 });
  assert.ok(Number.isFinite(facingAmount(collinear, { x: 1, y: -1, z: 1 })));
  assert.deepEqual(projectIsometric({ x: 0, y: 0, z: 0 }), { x: 0, y: 0 });
});

test("Projection Lab preserves depth, FOV, visibility and round-trip invariants", async () => {
  const {
    advanceFlightTime,
    cameraToNdc,
    cameraToWorld,
    ndcToScreen,
    perspectiveDivide,
    projectPerspective,
    projectionRoundTripError,
    screenToCameraAtDepth,
    screenToNdc,
    worldToCamera,
  } = await loadMath();

  const camera = { position: { x: 1, y: -2, z: 0.5 } };
  const lens = { verticalFovRadians: Math.PI / 3 };
  const worldPoint = { x: 3, y: 1, z: 6.5 };
  const cameraPoint = worldToCamera(worldPoint, camera);
  assert.deepEqual(cameraPoint, { x: 2, y: 3, z: 6 });
  assert.deepEqual(cameraToWorld(cameraPoint, camera), worldPoint);
  assert.deepEqual(perspectiveDivide({ x: 2, y: 1, z: 4 }), { x: 0.5, y: 0.25 });

  const nearNdc = cameraToNdc({ x: 1, y: 0.5, z: 4 }, lens, 1.5);
  const farNdc = cameraToNdc({ x: 1, y: 0.5, z: 8 }, lens, 1.5);
  assert.ok(Math.abs(farNdc.x - nearNdc.x * 0.5) < 1e-12);
  assert.ok(Math.abs(farNdc.y - nearNdc.y * 0.5) < 1e-12);

  const wideNdc = cameraToNdc({ x: 1, y: 0.5, z: 4 }, { verticalFovRadians: Math.PI / 2 }, 1.5);
  assert.ok(Math.abs(wideNdc.x) < Math.abs(nearNdc.x));
  assert.ok(Math.abs(wideNdc.y) < Math.abs(nearNdc.y));

  const screen = ndcToScreen({ x: 0.35, y: -0.4 }, 960, 640);
  const ndc = screenToNdc(screen, 960, 640);
  assert.ok(Math.hypot(ndc.x - 0.35, ndc.y + 0.4) < 1e-12);

  const originCamera = { position: { x: 0, y: 0, z: 0 } };
  assert.equal(
    projectPerspective({ x: 0, y: 0, z: -1 }, originCamera, lens, 0.5, 960, 640).status,
    "behind",
  );
  assert.equal(
    projectPerspective({ x: 0, y: 0, z: 0.25 }, originCamera, lens, 0.5, 960, 640).status,
    "before-near",
  );
  assert.equal(
    projectPerspective({ x: 0, y: 0, z: 0.5 }, originCamera, lens, 0.5, 960, 640).status,
    "visible",
  );
  assert.equal(
    projectPerspective({ x: 20, y: 0, z: 5 }, originCamera, lens, 0.5, 960, 640).status,
    "outside",
  );

  const fixedDepth = { x: 1.2, y: -0.7, z: 5 };
  const fixedNdc = cameraToNdc(fixedDepth, lens, 1.5);
  const fixedScreen = ndcToScreen(fixedNdc, 960, 640);
  const restored = screenToCameraAtDepth(fixedScreen, 5, lens, 960, 640);
  assert.ok(Math.hypot(restored.x - fixedDepth.x, restored.y - fixedDepth.y) < 1e-12);
  assert.ok(projectionRoundTripError(worldPoint, camera, lens, 960, 640) < 1e-12);
  assert.equal(advanceFlightTime(2, -1), 2);
  assert.equal(advanceFlightTime(2, 1), 2.1);
});

test("Rotation Lab preserves pivot, edge lengths, order and inverse invariants", async () => {
  const {
    DEFAULT_WORLD_TRIANGLE,
    advanceEulerAngles,
    applyRotationMouseDrag,
    maximumEdgeLengthError3,
    projectTriangle3,
    rotateEuler3,
    rotateX3,
    rotateY3,
    rotateZ3,
    rotationRoundTripError3,
    rotationTriangleCentroid,
    toLocalTriangle3,
    translateTriangle3,
  } = await loadMath();

  const pivot = rotationTriangleCentroid(DEFAULT_WORLD_TRIANGLE);
  const local = toLocalTriangle3(DEFAULT_WORLD_TRIANGLE);
  assert.ok(Math.hypot(pivot.x, pivot.y, pivot.z - 6) < 1e-12);
  const localCentroid = rotationTriangleCentroid(local);
  assert.ok(Math.hypot(localCentroid.x, localCentroid.y, localCentroid.z) < 1e-12);
  const restoredTriangle = translateTriangle3(local, pivot);
  for (const vertex of ["a", "b", "c"]) {
    assert.ok(
      Math.hypot(
        restoredTriangle[vertex].x - DEFAULT_WORLD_TRIANGLE[vertex].x,
        restoredTriangle[vertex].y - DEFAULT_WORLD_TRIANGLE[vertex].y,
        restoredTriangle[vertex].z - DEFAULT_WORLD_TRIANGLE[vertex].z,
      ) < 1e-12,
    );
  }

  const quarterTurn = Math.PI / 2;
  const source = { x: 1, y: 2, z: 3 };
  const rotatedX = rotateX3(source, quarterTurn);
  const rotatedY = rotateY3(source, quarterTurn);
  const rotatedZ = rotateZ3(source, quarterTurn);
  assert.ok(Math.hypot(rotatedX.x - 1, rotatedX.y + 3, rotatedX.z - 2) < 1e-12);
  assert.ok(Math.hypot(rotatedY.x - 3, rotatedY.y - 2, rotatedY.z + 1) < 1e-12);
  assert.ok(Math.hypot(rotatedZ.x + 2, rotatedZ.y - 1, rotatedZ.z - 3) < 1e-12);

  const angles = { pitch: 0.35, yaw: -0.7, roll: 0.25 };
  const xyz = rotateEuler3(source, angles, "xyz");
  const zyx = rotateEuler3(source, angles, "zyx");
  assert.ok(Math.hypot(xyz.x - zyx.x, xyz.y - zyx.y, xyz.z - zyx.z) > 1e-4);
  assert.ok(rotationRoundTripError3(source, angles, "xyz") < 1e-12);
  assert.ok(rotationRoundTripError3(source, angles, "zyx") < 1e-12);

  const rotatedTriangle = {
    a: rotateEuler3(local.a, angles, "xyz"),
    b: rotateEuler3(local.b, angles, "xyz"),
    c: rotateEuler3(local.c, angles, "xyz"),
  };
  assert.ok(maximumEdgeLengthError3(local, rotatedTriangle) < 1e-12);

  const dragged = applyRotationMouseDrag({ pitch: 0, yaw: 0, roll: 0 }, 20, -10, 0.01);
  assert.ok(Math.abs(dragged.yaw - 0.2) < 1e-12);
  assert.ok(Math.abs(dragged.pitch - 0.1) < 1e-12);
  const clamped = applyRotationMouseDrag({ pitch: 0, yaw: 0, roll: 0 }, 0, -10000, 0.01);
  const clampedNegative = applyRotationMouseDrag({ pitch: 0, yaw: 0, roll: 0 }, 0, 10000, 0.01);
  assert.ok(Math.abs(clamped.pitch - (89 * Math.PI) / 180) < 1e-12);
  assert.ok(Math.abs(clampedNegative.pitch + (89 * Math.PI) / 180) < 1e-12);

  assert.deepEqual(
    advanceEulerAngles({ pitch: 0, yaw: 0, roll: 0 }, { pitch: 1, yaw: 2, roll: 3 }, -1),
    { pitch: 0, yaw: 0, roll: 0 },
  );
  assert.deepEqual(
    advanceEulerAngles({ pitch: 0, yaw: 0, roll: 0 }, { pitch: 1, yaw: 2, roll: 3 }, 1),
    { pitch: 0.1, yaw: 0.2, roll: 0.30000000000000004 },
  );

  const camera = { position: { x: 0, y: 0, z: 0 } };
  const lens = { verticalFovRadians: Math.PI / 3 };
  assert.equal(projectTriangle3(DEFAULT_WORLD_TRIANGLE, camera, lens, 0.5, 960, 640).visible, true);
  assert.equal(
    projectTriangle3(
      { ...DEFAULT_WORLD_TRIANGLE, a: { x: 0, y: 0, z: -1 } },
      camera,
      lens,
      0.5,
      960,
      640,
    ).visible,
    false,
  );
});

test("Wireframe Cube Lab preserves indexed topology, projection cache and depth order", async () => {
  const {
    CUBE_EDGES,
    cubeRotationRoundTripError,
    cubeVertexDegrees,
    hasValidCubeTopology,
    makeCubeVertices,
    maximumCubeEdgeLengthError,
    projectWireframeCube,
    rotateCubeVertices,
    translateCubeVertices,
    visibleCubeEdgesBackToFront,
  } = await loadMath();

  const local = makeCubeVertices(1.25);
  assert.equal(local.length, 8);
  assert.deepEqual(local[0], { x: -1.25, y: -1.25, z: -1.25 });
  assert.deepEqual(local[6], { x: 1.25, y: 1.25, z: 1.25 });
  assert.equal(CUBE_EDGES.length, 12);
  assert.equal(hasValidCubeTopology(), true);
  assert.deepEqual(cubeVertexDegrees(), [3, 3, 3, 3, 3, 3, 3, 3]);

  const angles = { pitch: 0.35, yaw: -0.7, roll: 0.25 };
  const rotated = rotateCubeVertices(local, angles, "xyz");
  assert.ok(maximumCubeEdgeLengthError(local, rotated) < 1e-12);
  assert.ok(cubeRotationRoundTripError(local, angles, "xyz") < 1e-12);
  assert.ok(cubeRotationRoundTripError(local, angles, "zyx") < 1e-12);

  const world = translateCubeVertices(rotated, { x: 0, y: 0, z: 6 });
  const projected = projectWireframeCube(
    world,
    { position: { x: 0, y: 0, z: 0 } },
    { verticalFovRadians: Math.PI / 3 },
    0.5,
    960,
    640,
  );
  assert.equal(projected.projectionCount, 8);
  assert.equal(
    projected.vertices.every((vertex) => vertex.status === "visible"),
    true,
  );

  const visible = visibleCubeEdgesBackToFront(projected);
  assert.equal(visible.length, 12);
  for (let index = 1; index < visible.length; index += 1) {
    assert.ok(visible[index - 1].averageDepth >= visible[index].averageDepth);
  }
  for (const edge of visible) {
    assert.ok(edge.depthFactor >= 0 && edge.depthFactor <= 1);
  }
});

test("FPS Camera Lab preserves view inverse, basis, dt movement and room bounds", async () => {
  const {
    DEFAULT_ROOM_BOUNDS,
    advanceFpsCamera,
    advanceFpsCameraInRoom,
    applyFpsMouseLook,
    cameraBasisFps,
    fpsBasisError,
    fpsViewRoundTripError,
    makeRoomGeometry,
    magnitude3,
    subtract3,
    worldToCameraFps,
    worldToCameraTranslationFps,
  } = await loadMath();

  const room = makeRoomGeometry(DEFAULT_ROOM_BOUNDS, 2);
  assert.ok(room.length > 100);
  for (const segment of room) {
    for (const point of [segment.from, segment.to]) {
      assert.ok(point.x >= DEFAULT_ROOM_BOUNDS.minX && point.x <= DEFAULT_ROOM_BOUNDS.maxX);
      assert.ok(point.y >= DEFAULT_ROOM_BOUNDS.floorY && point.y <= DEFAULT_ROOM_BOUNDS.ceilingY);
      assert.ok(point.z >= DEFAULT_ROOM_BOUNDS.minZ && point.z <= DEFAULT_ROOM_BOUNDS.maxZ);
    }
  }

  const camera = {
    position: { x: 1, y: 1.6, z: 3 },
    yaw: (32 * Math.PI) / 180,
    pitch: (21 * Math.PI) / 180,
  };
  assert.deepEqual(worldToCameraTranslationFps({ x: 3, y: 2, z: 8 }, camera), {
    x: 2,
    y: 0.3999999999999999,
    z: 5,
  });
  assert.ok(fpsBasisError(camera) < 1e-12);
  assert.ok(fpsViewRoundTripError({ x: 2, y: 1, z: 12 }, camera) < 1e-12);
  const basis = cameraBasisFps(camera);
  const pointOnForward = {
    x: camera.position.x + basis.forward.x * 5,
    y: camera.position.y + basis.forward.y * 5,
    z: camera.position.z + basis.forward.z * 5,
  };
  const cameraForward = worldToCameraFps(pointOnForward, camera);
  assert.ok(Math.hypot(cameraForward.x, cameraForward.y, cameraForward.z - 5) < 1e-12);

  const simulate = (fps, input) => {
    let current = { position: { x: 0, y: 1.6, z: 2 }, yaw: 0, pitch: 0 };
    for (let frame = 0; frame < fps; frame += 1) {
      current = advanceFpsCamera(current, input, 3.5, 1 / fps);
    }
    return current;
  };
  const straight = simulate(60, { strafe: 0, advance: 1 });
  const diagonal = simulate(60, { strafe: 1, advance: 1 });
  const origin = { x: 0, y: 1.6, z: 2 };
  assert.ok(Math.abs(magnitude3(subtract3(straight.position, origin)) - 3.5) < 1e-12);
  assert.ok(
    Math.abs(
      magnitude3(subtract3(diagonal.position, origin)) -
        magnitude3(subtract3(straight.position, origin)),
    ) < 1e-12,
  );
  assert.ok(
    Math.abs(simulate(30, { strafe: 0, advance: 1 }).position.z - straight.position.z) < 1e-12,
  );
  assert.ok(
    Math.abs(simulate(144, { strafe: 0, advance: 1 }).position.z - straight.position.z) < 1e-12,
  );

  const looked = applyFpsMouseLook(camera, 100000, -100000, 0.0025);
  assert.ok(Math.abs(looked.yaw) <= Math.PI);
  assert.ok(looked.pitch < Math.PI / 2);
  const clamped = advanceFpsCameraInRoom(
    { position: { x: 5.6, y: 1.6, z: 21.6 }, yaw: 0, pitch: 0 },
    { strafe: 1, advance: 1 },
    20,
    0.1,
    DEFAULT_ROOM_BOUNDS,
    1.6,
    0.35,
  );
  assert.ok(clamped.position.x <= DEFAULT_ROOM_BOUNDS.maxX - 0.35);
  assert.ok(clamped.position.z <= DEFAULT_ROOM_BOUNDS.maxZ - 0.35);
  assert.equal(clamped.position.y, 1.6);
});

test("3D Pipeline Lab preserves Mat4 convention, clip w, depth and MVP agreement", async () => {
  const {
    DEFAULT_PIPELINE_CAMERA,
    DEFAULT_PIPELINE_LENS,
    DEFAULT_PIPELINE_MODEL,
    advancePipelineYaw,
    pipelineAgreementError,
    pipelineIdentityMatrix,
    pipelineModelMatrix,
    pipelineModelPointDirect,
    pipelinePerspectiveDivide,
    pipelineProjectionMatrix,
    pipelineToDirection,
    pipelineToPoint,
    pipelineTransform,
    pipelineTranslationMatrix,
    pipelineViewMatrix,
    pipelineWorldToCameraDirect,
    trace3dPipeline,
  } = await loadMath();

  const source = { x: 2, y: -3, z: 4, w: 1 };
  assert.deepEqual(pipelineTransform(pipelineIdentityMatrix(), source), source);

  const translation = pipelineTranslationMatrix({ x: 5, y: -2, z: 7 });
  assert.deepEqual(pipelineTransform(translation, pipelineToPoint({ x: 1, y: 2, z: 3 })), {
    x: 6,
    y: 0,
    z: 10,
    w: 1,
  });
  assert.deepEqual(pipelineTransform(translation, pipelineToDirection({ x: 1, y: 2, z: 3 })), {
    x: 1,
    y: 2,
    z: 3,
    w: 0,
  });

  const local = { x: 1.25, y: -0.5, z: 2 };
  const model = {
    position: { x: 3, y: -1, z: 8 },
    scale: { x: 2, y: 0.5, z: 1.5 },
    yaw: (37 * Math.PI) / 180,
  };
  const worldByMatrix = pipelineTransform(pipelineModelMatrix(model), pipelineToPoint(local));
  const worldDirect = pipelineModelPointDirect(local, model);
  assert.ok(
    Math.hypot(
      worldByMatrix.x - worldDirect.x,
      worldByMatrix.y - worldDirect.y,
      worldByMatrix.z - worldDirect.z,
    ) < 1e-12,
  );

  const camera = {
    position: { x: 1.5, y: 0.8, z: -2 },
    yaw: (31 * Math.PI) / 180,
    pitch: (-17 * Math.PI) / 180,
  };
  const worldPoint = { x: 4, y: 2, z: 9 };
  const cameraByMatrix = pipelineTransform(pipelineViewMatrix(camera), pipelineToPoint(worldPoint));
  const cameraDirect = pipelineWorldToCameraDirect(worldPoint, camera);
  assert.ok(
    Math.hypot(
      cameraByMatrix.x - cameraDirect.x,
      cameraByMatrix.y - cameraDirect.y,
      cameraByMatrix.z - cameraDirect.z,
    ) < 1e-12,
  );

  const projection = pipelineProjectionMatrix(DEFAULT_PIPELINE_LENS, 16 / 9);
  const clip = pipelineTransform(projection, pipelineToPoint({ x: 1, y: -0.5, z: 7 }));
  assert.equal(clip.w, 7);
  const nearNdc = pipelinePerspectiveDivide(
    pipelineTransform(
      projection,
      pipelineToPoint({ x: 0, y: 0, z: DEFAULT_PIPELINE_LENS.nearPlane }),
    ),
  );
  const farNdc = pipelinePerspectiveDivide(
    pipelineTransform(
      projection,
      pipelineToPoint({ x: 0, y: 0, z: DEFAULT_PIPELINE_LENS.farPlane }),
    ),
  );
  assert.ok(Math.abs(nearNdc.z) < 1e-12);
  assert.ok(Math.abs(farNdc.z - 1) < 1e-12);

  const centeredModel = {
    position: { x: 0, y: 0, z: 5 },
    scale: { x: 1, y: 1, z: 1 },
    yaw: 0,
  };
  const visible = trace3dPipeline(
    { x: 0, y: 0, z: 0 },
    centeredModel,
    DEFAULT_PIPELINE_CAMERA,
    DEFAULT_PIPELINE_LENS,
    800,
    600,
  );
  assert.equal(visible.status, "visible");
  assert.deepEqual(visible.screen, { x: 400, y: 300 });

  const cases = [
    [{ ...centeredModel, position: { x: 0, y: 0, z: 0.2 } }, "before-near"],
    [{ ...centeredModel, position: { x: 0, y: 0, z: -2 } }, "behind"],
    [{ ...centeredModel, position: { x: 0, y: 0, z: 34 } }, "beyond-far"],
    [{ ...centeredModel, position: { x: 12, y: 0, z: 4 } }, "outside"],
  ];
  for (const [caseModel, expectedStatus] of cases) {
    assert.equal(
      trace3dPipeline(
        { x: 0, y: 0, z: 0 },
        caseModel,
        DEFAULT_PIPELINE_CAMERA,
        DEFAULT_PIPELINE_LENS,
        800,
        600,
      ).status,
      expectedStatus,
    );
  }

  assert.ok(pipelineAgreementError(local, model, camera, DEFAULT_PIPELINE_LENS, 1280, 720) < 1e-12);
  assert.ok(
    Math.abs(
      advancePipelineYaw(DEFAULT_PIPELINE_MODEL.yaw, 2, 0.5) - (DEFAULT_PIPELINE_MODEL.yaw + 0.2),
    ) < 1e-12,
  );
});

test("Triangle Raster Lab preserves bounds, coverage, edge ownership and barycentric weights", async () => {
  const {
    barycentricSumError,
    interpolateBarycentricRgb,
    normalizeTriangleWinding,
    rasterPixelCenter,
    rasterizeTriangleCoverage,
    sampleRasterTriangle,
    sharedTriangleEdgeOwnership,
    triangleBounds,
    triangleCandidateCount,
    triangleSignedDoubleArea,
    triangleWinding,
  } = await loadMath();

  const positive = {
    a: { x: 0, y: 0 },
    b: { x: 4, y: 0 },
    c: { x: 0, y: 4 },
  };
  const negative = { a: positive.a, b: positive.c, c: positive.b };
  assert.equal(triangleSignedDoubleArea(positive), 16);
  assert.equal(triangleWinding(positive), "positive");
  assert.equal(triangleWinding(negative), "negative");
  assert.equal(triangleSignedDoubleArea(normalizeTriangleWinding(negative)), 16);

  const bounds = triangleBounds(
    { a: { x: -2.5, y: 1 }, b: { x: 6.2, y: -4 }, c: { x: 3, y: 8 } },
    6,
    5,
  );
  assert.deepEqual(bounds, { minX: 0, minY: 0, maxX: 5, maxY: 4 });
  assert.equal(triangleCandidateCount({ minX: 2, minY: 3, maxX: 5, maxY: 7 }), 20);
  assert.deepEqual(rasterPixelCenter(1, 1), { x: 1.5, y: 1.5 });

  const sample = sampleRasterTriangle(positive, { x: 1.5, y: 1.5 }, "inclusive");
  assert.equal(sample.inside, true);
  assert.ok(barycentricSumError(sample.barycentric) < 1e-12);
  assert.equal(sampleRasterTriangle(negative, { x: 1.5, y: 1.5 }, "inclusive").inside, true);
  assert.equal(sampleRasterTriangle(positive, { x: 3.5, y: 3.5 }, "inclusive").inside, false);

  const raster = rasterizeTriangleCoverage(positive, 8, 8, "inclusive");
  assert.equal(raster.testedCount, raster.candidateCount);
  assert.equal(raster.coveredCount, raster.fragments.length);
  assert.ok(raster.coveredCount > 0 && raster.coveredCount < raster.candidateCount);
  const stopped = rasterizeTriangleCoverage(positive, 8, 8, "inclusive", 3);
  assert.equal(stopped.testedCount, 3);

  const second = {
    a: { x: 4, y: 0 },
    b: { x: 4, y: 4 },
    c: { x: 0, y: 4 },
  };
  const shared = { x: 2.5, y: 1.5 };
  assert.equal(sharedTriangleEdgeOwnership(positive, second, shared, "inclusive"), 2);
  assert.equal(sharedTriangleEdgeOwnership(positive, second, shared, "top-left"), 1);

  assert.deepEqual(interpolateBarycentricRgb({ a: 1, b: 0, c: 0 }), {
    red: 255,
    green: 0,
    blue: 0,
  });
  assert.deepEqual(interpolateBarycentricRgb({ a: 0.25, b: 0.25, c: 0.5 }), {
    red: 64,
    green: 64,
    blue: 128,
  });
});
