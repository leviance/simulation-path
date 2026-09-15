import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 18 keeps its catalog contract after Project 17 is published", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  assert.equal(
    catalog.some((project) => project.id === "17"),
    true,
  );
  const project = catalog.find((entry) => entry.id === "18");
  assert.equal(project.slug, "near-plane-clipper");
  assert.equal(project.checkpointCount, 7);
  assert.equal(project.demoId, "near-plane");
});

test("Project 18 teaches clipping as a complete camera-space pipeline", async () => {
  const contentDirectory = path.join(workspace, "content", "near-plane-clipper");
  const sourceDirectory = path.join(workspace, "examples", "project-18-near-plane-clipper");

  const scene = await readFile(
    path.join(contentDirectory, "01-dung-canh-tam-giac-cat-near-plane.mdx"),
    "utf8",
  );
  assert.match(scene, /camera-space triangle.*clip.*project.*rasterize/s);
  assert.match(scene, /discard-whole/);

  const classify = await readFile(
    path.join(contentDirectory, "02-signed-distance-va-half-space.mdx"),
    "utf8",
  );
  assert.match(classify, /d = z - near/);
  assert.match(classify, /isInsideNearPlane/);

  const intersection = await readFile(
    path.join(contentDirectory, "03-giao-diem-canh-va-near-plane.mdx"),
    "utf8",
  );
  assert.match(intersection, /intersectNearPlane/);
  assert.match(intersection, /position và color dùng chung t/i);

  const polygon = await readFile(
    path.join(contentDirectory, "04-clip-triangle-thanh-polygon.mdx"),
    "utf8",
  );
  assert.match(polygon, /Sutherland–Hodgman/);
  assert.match(polygon, /inside \| outside/);

  const fan = await readFile(
    path.join(contentDirectory, "05-chia-polygon-thanh-triangle.mdx"),
    "utf8",
  );
  assert.match(fan, /triangulateFan/);
  assert.match(fan, /\(v_0,v_2,v_3\)/);

  const raster = await readFile(
    path.join(contentDirectory, "06-project-va-rasterize-ket-qua.mdx"),
    "utf8",
  );
  assert.match(raster, /std::nullopt/);
  assert.match(raster, /rasterizeScreenTriangle/);

  const validation = await readFile(
    path.join(contentDirectory, "07-sweep-qua-camera-va-validation.mdx"),
    "utf8",
  );
  assert.match(validation, /3\/4\/3\/0/);
  assert.match(validation, /Project 18 đã hoàn chỉnh/i);

  const header = await readFile(
    path.join(sourceDirectory, "source-template", "include", "lab.hpp"),
    "utf8",
  );
  const tests = await readFile(path.join(sourceDirectory, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "near-plane-lab.tsx"),
    "utf8",
  );
  assert.match(header, /ClippedPolygon clipTriangleToNearPlane/);
  assert.match(header, /TriangleBatch triangulateFan/);
  assert.match(header, /std::optional<ScreenVertex> projectVertex/);
  assert.match(tests, /one outside vertex produces a four-vertex polygon/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
});
