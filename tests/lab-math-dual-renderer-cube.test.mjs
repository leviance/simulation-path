import assert from "node:assert/strict";
import test from "node:test";
import * as cube from "../lib/labs/dual-renderer-cube.ts";

test("indexed cube stores six independent faces and valid element indices", () => {
  const mesh = cube.makeIndexedCube();
  assert.equal(mesh.vertices.length, 24);
  assert.equal(mesh.indices.length, 36);
  assert.ok(mesh.indices.every((index) => index >= 0 && index < mesh.vertices.length));
  for (let face = 0; face < 6; face += 1) {
    const offset = face * 6;
    assert.deepEqual(mesh.indices.slice(offset, offset + 6), [
      face * 4,
      face * 4 + 1,
      face * 4 + 2,
      face * 4,
      face * 4 + 2,
      face * 4 + 3,
    ]);
  }
});

test("column-major MVP keeps clip and screen values finite", () => {
  const mesh = cube.makeIndexedCube();
  const mvp = cube.makeMvp(cube.defaultCubeScene, 16 / 9);
  const trace = cube.traceCubeVertex(mesh.vertices[0], mvp, 960, 540);
  assert.ok(trace.clip.w > 0);
  for (const value of [
    trace.clip.x,
    trace.clip.y,
    trace.clip.z,
    trace.clip.w,
    trace.ndc.x,
    trace.ndc.y,
    trace.ndc.z,
    trace.screen.x,
    trace.screen.y,
    trace.screen.z,
  ]) {
    assert.ok(Number.isFinite(value));
  }
  assert.ok(trace.screen.z >= 0 && trace.screen.z <= 1);
});

test("cube winding exposes front and back faces before culling", () => {
  const triangles = cube.buildCubeTriangles(
    cube.makeIndexedCube(),
    cube.defaultCubeScene,
    160,
    120,
  );
  assert.equal(triangles.length, 12);
  assert.ok(triangles.some((triangle) => triangle.frontFacing));
  assert.ok(triangles.some((triangle) => !triangle.frontFacing));
});

test("depth test makes CPU output independent from triangle order", () => {
  const first = cube.renderCubeContract(96, 72, cube.defaultCubeScene, false);
  const reversed = cube.renderCubeContract(96, 72, cube.defaultCubeScene, true);
  assert.deepEqual(cube.compareFrames(first, reversed), { colorPixels: 0, depthPixels: 0 });
  assert.ok(first.passedFragments > 0);
  assert.ok(first.culledTriangles > 0);
});

test("disabling depth reveals order-dependent output", () => {
  const state = { ...cube.defaultCubeScene, depthEnabled: false, cullingEnabled: false };
  const first = cube.renderCubeContract(96, 72, state, false);
  const reversed = cube.renderCubeContract(96, 72, state, true);
  assert.ok(cube.compareFrames(first, reversed).colorPixels > 0);
});

test("independent CPU and OpenGL-coordinate rasterizers agree", () => {
  const scenes = [
    cube.defaultCubeScene,
    { ...cube.defaultCubeScene, angleX: 0.2, angleY: 1.1 },
    { ...cube.defaultCubeScene, cullingEnabled: false },
    { ...cube.defaultCubeScene, depthEnabled: false, cullingEnabled: false },
  ];

  for (const scene of scenes) {
    for (const reverseOrder of [false, true]) {
      const cpu = cube.renderCubeContract(96, 72, scene, reverseOrder);
      const gpuReference = cube.renderGpuReferenceContract(96, 72, scene, reverseOrder);
      assert.deepEqual(cube.compareFrames(cpu, gpuReference), {
        colorPixels: 0,
        depthPixels: 0,
      });
      assert.equal(cpu.passedFragments, gpuReference.passedFragments);
      assert.equal(cpu.culledTriangles, gpuReference.culledTriangles);
    }
  }
});

test("renderer selection changes the backend label but not scene state", () => {
  const scene = { ...cube.defaultCubeScene };
  assert.equal(cube.rendererLabel("cpu"), "F1 · CPU rasterizer");
  assert.equal(cube.rendererLabel("gpu"), "F2 · OpenGL GPU");
  assert.deepEqual(scene, cube.defaultCubeScene);
});
