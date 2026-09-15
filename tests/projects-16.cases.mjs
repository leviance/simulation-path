import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 16 builds a triangle rasterizer through seven content-driven checkpoints", async () => {
  const contentDirectory = path.join(workspace, "content", "triangle-rasterizer");
  const sourceDirectory = path.join(workspace, "examples", "project-16-triangle-rasterizer");
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "16");
  assert.equal(project.checkpointCount, 7);
  assert.equal(project.demoId, "triangle-raster");

  const frame = await readFile(
    path.join(contentDirectory, "01-dung-khung-tam-giac-screen-space.mdx"),
    "utf8",
  );
  assert.match(frame, /Triangle2/);
  assert.match(frame, /drawLine/);
  assert.match(frame, /SDL_UpdateTexture/);

  const bounds = await readFile(
    path.join(contentDirectory, "02-khoanh-vung-bounding-box.mdx"),
    "utf8",
  );
  assert.match(bounds, /triangleBounds/);
  assert.match(bounds, /ceil\(max\).*1/s);

  const edges = await readFile(
    path.join(contentDirectory, "03-edge-function-va-winding.mdx"),
    "utf8",
  );
  assert.match(edges, /orient2D/);
  assert.match(edges, /normalizePositiveWinding/);

  const coverage = await readFile(
    path.join(contentDirectory, "04-pixel-center-va-coverage.mdx"),
    "utf8",
  );
  assert.match(coverage, /x\+0\.5/);
  assert.match(coverage, /CoverageSample/);

  const loop = await readFile(path.join(contentDirectory, "05-vong-lap-raster.mdx"), "utf8");
  assert.match(loop, /rasterizeTriangle/);
  assert.match(loop, /shadePixel/);
  assert.match(loop, /candidateCount/);

  const rule = await readFile(path.join(contentDirectory, "06-top-left-rule.mdx"), "utf8");
  assert.match(rule, /isTopLeftEdge/);
  assert.match(rule, /overlap/);

  const finalLesson = await readFile(
    path.join(contentDirectory, "07-barycentric-va-validation.mdx"),
    "utf8",
  );
  assert.match(finalLesson, /interpolateColor/);
  assert.match(finalLesson, /sharedEdgeCoverageCount/);
  assert.match(finalLesson, /Project 16 đã hoàn chỉnh/i);

  const header = await readFile(
    path.join(sourceDirectory, "source-template", "include", "lab.hpp"),
    "utf8",
  );
  const main = await readFile(
    path.join(sourceDirectory, "source-template", "src", "main.cpp"),
    "utf8",
  );
  const tests = await readFile(path.join(sourceDirectory, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "triangle-raster-lab.tsx"),
    "utf8",
  );

  assert.match(header, /struct CoverageSample/);
  assert.match(header, /RasterStats rasterizeTriangle/);
  assert.match(header, /isTopLeftEdge/);
  assert.match(header, /interpolateColor/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(main, /coverage\[index\]/);
  assert.match(tests, /top-left rule gives shared edge one owner/);
  assert.match(tests, /barycentric weights sum to one/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
});
