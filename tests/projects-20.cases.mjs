import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 20 keeps eight lessons after Project 17 is published", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  assert.equal(
    catalog.some((project) => project.id === "17"),
    true,
  );
  const project = catalog.find((entry) => entry.id === "20");
  assert.equal(project.slug, "perspective-checkerboard");
  assert.equal(project.checkpointCount, 8);
  assert.equal(project.demoId, "perspective-texture");
});

test("Project 20 teaches texture mapping as one traceable CPU pipeline", async () => {
  const contentDirectory = path.join(workspace, "content", "perspective-checkerboard");
  const sourceDirectory = path.join(workspace, "examples", "project-20-perspective-checkerboard");

  const quad = await readFile(
    path.join(contentDirectory, "01-dung-quad-nghieng-va-uv.mdx"),
    "utf8",
  );
  assert.match(quad, /bốn `TexturedVertex`/);
  assert.match(quad, /hai triangle dùng chung vertex/i);
  assert.match(quad, /quadTriangle/);

  const sampling = await readFile(
    path.join(contentDirectory, "02-tao-checker-texture-va-sample-texel.mdx"),
    "utf8",
  );
  assert.match(sampling, /nearest.*clamp.*repeat/is);
  assert.match(sampling, /value - std::floor\(value\)/);

  const affine = await readFile(
    path.join(contentDirectory, "03-noi-suy-uv-affine-trong-rasterizer.mdx"),
    "utf8",
  );
  assert.match(affine, /uv.*λA.*λB.*λC/is);
  assert.match(affine, /top-left/);

  const reciprocal = await readFile(
    path.join(contentDirectory, "05-suy-ra-reciprocal-depth.mdx"),
    "utf8",
  );
  assert.match(reciprocal, /oneOverZ.*uOverZ.*vOverZ/is);
  assert.match(reciprocal, /reciprocalDepthDenominator/);

  const correct = await readFile(
    path.join(contentDirectory, "06-khoi-phuc-uv-perspective-correct.mdx"),
    "utf8",
  );
  assert.match(correct, /uOverZ \/ denominator/);
  assert.match(correct, /constant-depth/i);

  const clipping = await readFile(
    path.join(contentDirectory, "07-clip-near-plane-ma-khong-lam-roi-uv.mdx"),
    "utf8",
  );
  assert.match(clipping, /một tham số `t` cho cả XYZ và UV/);
  assert.match(clipping, /project sau clipping/i);

  const finalLesson = await readFile(
    path.join(contentDirectory, "08-ghep-texture-mapper-va-validation.mdx"),
    "utf8",
  );
  assert.match(finalLesson, /near.*projection.*coverage.*corrected.*sampler/is);
  assert.match(finalLesson, /Starter, tám checkpoint và final/);

  const header = await readFile(
    path.join(sourceDirectory, "source-template", "include", "lab.hpp"),
    "utf8",
  );
  const tests = await readFile(path.join(sourceDirectory, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "perspective-texture-lab.tsx"),
    "utf8",
  );
  assert.match(header, /interpolatePerspectiveUv/);
  assert.match(header, /clipTriangleToNearPlane/);
  assert.match(header, /renderTexturedTriangle/);
  assert.match(tests, /affine and perspective uv agree at constant depth/);
  assert.match(tests, /intersection uv uses the same t as position/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
});
