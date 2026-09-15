import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 17 builds a solid cube and Z-buffer through seven content-driven checkpoints", async () => {
  const contentDirectory = path.join(workspace, "content", "solid-cube-z-buffer");
  const sourceDirectory = path.join(workspace, "examples", "project-17-solid-cube-z-buffer");
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "17");
  assert.equal(project.checkpointCount, 7);
  assert.equal(project.demoId, "z-buffer");

  const mesh = await readFile(
    path.join(contentDirectory, "01-dung-khoi-lap-phuong-dac.mdx"),
    "utf8",
  );
  assert.match(mesh, /makeCubeMesh/);
  assert.match(mesh, /12 triangle/i);

  const order = await readFile(path.join(contentDirectory, "02-loi-thu-tu-ve.mdx"), "utf8");
  assert.match(order, /triangleIndexAt/);
  assert.match(order, /Painter/i);

  const storage = await readFile(
    path.join(contentDirectory, "03-tao-va-clear-depth-buffer.mdx"),
    "utf8",
  );
  assert.match(storage, /struct DepthBuffer/);
  assert.match(storage, /clear.*1\.0/is);
  assert.match(storage, /row-major/i);

  const interpolation = await readFile(
    path.join(contentDirectory, "04-noi-suy-ndc-depth.mdx"),
    "utf8",
  );
  assert.match(interpolation, /interpolateNdcDepth/);
  assert.match(interpolation, /w_A.*z_A/s);

  const depthTest = await readFile(
    path.join(contentDirectory, "05-depth-test-va-depth-write.mdx"),
    "utf8",
  );
  assert.match(depthTest, /depthTestAndWrite/);
  assert.match(depthTest, /newDepth < storedDepth/);

  const cube = await readFile(path.join(contentDirectory, "06-rasterize-toan-bo-cube.mdx"), "utf8");
  assert.match(cube, /renderCube/);
  assert.match(cube, /passedCount/);

  const validation = await readFile(
    path.join(contentDirectory, "07-kiem-chung-doc-lap-draw-order.mdx"),
    "utf8",
  );
  assert.match(validation, /buffersNearlyEqual/);
  assert.match(validation, /Project 17 đã hoàn chỉnh/i);

  const header = await readFile(
    path.join(sourceDirectory, "source-template", "include", "lab.hpp"),
    "utf8",
  );
  const main = await readFile(
    path.join(sourceDirectory, "source-template", "src", "main.cpp"),
    "utf8",
  );
  const cppTests = await readFile(path.join(sourceDirectory, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "z-buffer-lab.tsx"),
    "utf8",
  );

  assert.match(header, /struct DepthBuffer/);
  assert.match(header, /interpolateNdcDepth/);
  assert.match(header, /depthTestAndWrite/);
  assert.match(header, /RenderStats renderCube/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(main, /depthBuffer\.resize/);
  assert.match(cppTests, /color buffer is independent of draw order/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
});
