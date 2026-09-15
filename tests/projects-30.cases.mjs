import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 30 publishes a nine-checkpoint Point Cloud Octree", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "30");
  assert.equal(project.slug, "point-cloud-octree");
  assert.equal(project.sourceDirectory, "project-30-point-cloud-octree");
  assert.equal(project.checkpointCount, 9);
  assert.equal(project.demoId, "point-cloud-octree");
});

test("Project 30 separates 3D visualization from world-space Octree correctness", async () => {
  const content = path.join(workspace, "content", "point-cloud-octree");
  const source = path.join(workspace, "examples", "project-30-point-cloud-octree");
  const lessons = await Promise.all(
    [
      "01-point-cloud-va-tam-octant.mdx",
      "02-root-node-va-index-storage.mdx",
      "03-split-tam-child-va-redistribute.mdx",
      "04-inspector-kiem-tra-topology-3d.mdx",
      "05-truy-van-aabb-bang-pruning.mdx",
      "06-doi-chieu-brute-force-oracle.mdx",
      "07-benchmark-cong-bang.mdx",
      "08-capacity-study.mdx",
      "09-hoan-thien-point-cloud-octree.mdx",
    ].map((file) => readFile(path.join(content, file), "utf8")),
  );

  assert.match(lessons[0], /world space.*octant 7.*positive half/is);
  assert.match(lessons[1], /root leaf.*100\.000.*candidates/is);
  assert.match(lessons[2], /reference.*reallocate.*redistribute/is);
  assert.match(lessons[3], /every point.*child bounds.*capacity/is);
  assert.match(lessons[4], /prunedNodes.*candidatesChecked.*exact/is);
  assert.match(lessons[5], /canonical.*brute force.*split-plane/is);
  assert.match(lessons[6], /warm-up.*checksum.*N.*Q.*R/is);
  assert.match(lessons[7], /capacity.*8.*16.*32.*64.*rebuild/is);
  assert.match(lessons[8], /CTest.*Debug.*Release.*Project 31.*Barnes–Hut/is);

  const header = await readFile(path.join(source, "source-template", "include", "lab.hpp"), "utf8");
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "point-cloud-octree-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "projectPointWithOrbit",
    "octreeOctant",
    "octreeChildBounds",
    "createRootOctree",
    "insertAtNode",
    "buildOctree",
    "inspectOctreeTopology",
    "queryOctree",
    "octreeMatchesBruteForce",
    "benchmarkOctree",
    "makeCapacityStudy",
    "validateOctreeExperiment",
  ]) {
    assert.ok(header.includes(symbol), `Project 30 header is missing ${symbol}`);
  }
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(tests, /each point index appears in exactly one leaf/);
  assert.match(tests, /Octree and brute benchmark checksums match/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Draw sample \/ indexed workload/);
  assert.match(canvas, /Chạy capacity study/);
});
