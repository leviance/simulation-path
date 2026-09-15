import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 29 publishes an eight-checkpoint visible Quadtree", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "29");
  assert.equal(project.slug, "visible-quadtree");
  assert.equal(project.sourceDirectory, "project-29-visible-quadtree");
  assert.equal(project.checkpointCount, 8);
  assert.equal(project.demoId, "visible-quadtree");
});

test("Project 29 validates storage, pruning and output instead of drawing decorative boxes", async () => {
  const content = path.join(workspace, "content", "visible-quadtree");
  const source = path.join(workspace, "examples", "project-29-visible-quadtree");
  const lessons = await Promise.all(
    [
      "01-vung-chon-va-quy-uoc-aabb.mdx",
      "02-root-node-va-leaf-capacity.mdx",
      "03-split-node-va-redistribute.mdx",
      "04-kiem-tra-topology-cua-tree.mdx",
      "05-truy-van-vung-chon-bang-pruning.mdx",
      "06-doi-chieu-voi-brute-force-oracle.mdx",
      "07-benchmark-va-chon-leaf-capacity.mdx",
      "08-hoan-thien-visible-quadtree-va-nghiem-thu.mdx",
    ].map((file) => readFile(path.join(content, file), "utf8")),
  );

  assert.match(lessons[0], /normalize.*AABB.*split-line.*east.*north/is);
  assert.match(lessons[1], /root leaf.*100\.000.*indices.*brute force/is);
  assert.match(lessons[2], /split.*redistribute.*maximumDepth.*minimumNodeSize/is);
  assert.match(lessons[3], /everyParticleStoredOnce.*internalNodesEmpty.*statisticsMatch/is);
  assert.match(lessons[4], /prunedNodes.*candidatesChecked.*exact/is);
  assert.match(lessons[5], /canonical.*brute-force oracle.*hit set/is);
  assert.match(lessons[6], /warm-up.*leafCapacity.*checksum/is);
  assert.match(lessons[6], /rebuildMicroseconds/is);
  assert.match(lessons[7], /CTest.*Project 30.*Octree/is);

  const header = await readFile(path.join(source, "source-template", "include", "lab.hpp"), "utf8");
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "visible-quadtree-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "normalizeSelectionBox",
    "quadtreeQuadrant",
    "createRootQuadtree",
    "insertAtNode",
    "inspectQuadtreeTopology",
    "queryQuadtree",
    "quadtreeMatchesBruteForce",
    "benchmarkQuadtree",
    "makeCapacityStudy",
    "validateQuadtreeExperiment",
  ]) {
    assert.ok(header.includes(symbol), `Project 29 header is missing ${symbol}`);
  }
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(tests, /each particle index appears in exactly one leaf/);
  assert.match(tests, /Quadtree and brute benchmark checksums match/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Draw sample \/ indexed workload/);
  assert.match(canvas, /Chạy capacity study/);
});
