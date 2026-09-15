import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 28 publishes an eight-checkpoint Spatial Grid query", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "28");
  assert.equal(project.slug, "spatial-grid-neighbor-query");
  assert.equal(project.sourceDirectory, "project-28-spatial-grid-neighbor-query");
  assert.equal(project.checkpointCount, 8);
  assert.equal(project.demoId, "spatial-grid-neighbor-query");
});

test("Project 28 teaches a validated grid instead of a decorative overlay", async () => {
  const content = path.join(workspace, "content", "spatial-grid-neighbor-query");
  const source = path.join(workspace, "examples", "project-28-spatial-grid-neighbor-query");
  const lessons = await Promise.all(
    [
      "01-tu-world-position-den-dia-chi-cell.mdx",
      "02-xay-buckets-cho-100000-particles.mdx",
      "03-chon-candidate-cells-quanh-circle.mdx",
      "04-loc-candidates-thanh-neighbors-chinh-xac.mdx",
      "05-doi-chieu-voi-brute-force-oracle.mdx",
      "06-benchmark-grid-va-baseline-cong-bang.mdx",
      "07-chon-cell-size-bang-du-lieu.mdx",
      "08-hoan-thien-spatial-grid-va-nghiem-thu.mdx",
    ].map((file) => readFile(path.join(content, file), "utf8")),
  );

  assert.match(lessons[0], /floor.*clamp.*row-major/is);
  assert.match(lessons[1], /bucket.*100\.000.*đúng một lần/is);
  assert.match(lessons[2], /AABB.*conservative.*candidate cells/is);
  assert.match(lessons[3], /visitedCells.*candidatesChecked.*nearest/is);
  assert.match(lessons[4], /canonical.*brute-force oracle.*hit set/is);
  assert.match(lessons[5], /warm-up.*checksum.*rebuild/is);
  assert.match(lessons[6], /0\.025.*0\.05.*0\.1.*0\.2/is);
  assert.match(lessons[7], /Project 29.*Quadtree.*CTest/is);

  const header = await readFile(path.join(source, "source-template", "include", "lab.hpp"), "utf8");
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "spatial-grid-neighbor-query-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "spatialGridAddress",
    "buildSpatialGrid",
    "spatialGridQueryCellRange",
    "querySpatialGrid",
    "spatialGridMatchesBruteForce",
    "benchmarkSpatialGrid",
    "makeCellSizeStudy",
    "validateSpatialGridExperiment",
  ]) {
    assert.ok(header.includes(symbol), `Project 28 header is missing ${symbol}`);
  }
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(tests, /each particle index appears in exactly one bucket/);
  assert.match(tests, /grid and brute benchmark checksums match/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Draw sample \/ indexed workload/);
  assert.match(canvas, /Chạy cell-size study/);
});
