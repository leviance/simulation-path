import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 31 publishes a ten-checkpoint Barnes-Hut N-body simulation", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "31");
  assert.equal(project.slug, "barnes-hut-nbody");
  assert.equal(project.sourceDirectory, "project-31-barnes-hut-nbody");
  assert.equal(project.checkpointCount, 10);
  assert.equal(project.demoId, "barnes-hut-nbody");
});

test("Project 31 teaches a measured direct-to-Barnes-Hut progression", async () => {
  const content = path.join(workspace, "content", "barnes-hut-nbody");
  const source = path.join(workspace, "examples", "project-31-barnes-hut-nbody");
  const lessons = await Promise.all(
    [
      "01-thien-ha-va-trang-thai-body.mdx",
      "02-luc-hap-dan-va-softening.mdx",
      "03-direct-n-body-o-n-binh-phuong.mdx",
      "04-fixed-step-va-symplectic-euler.mdx",
      "05-mass-octree-va-center-of-mass.mdx",
      "06-barnes-hut-opening-criterion.mdx",
      "07-self-force-va-topology-inspector.mdx",
      "08-theta-accuracy-sweep.mdx",
      "09-scaling-study.mdx",
      "10-hoan-thien-barnes-hut-n-body.mdx",
    ].map((file) => readFile(path.join(content, file), "utf8")),
  );

  assert.match(lessons[0], /world space.*center of mass.*momentum/is);
  assert.match(lessons[1], /softening.*3\/2.*sourceMass/is);
  assert.match(lessons[2], /N−1.*N×\(N−1\).*oracle/is);
  assert.match(lessons[3], /accumulator.*1\/240.*maximum-step guard.*velocity.*position/is);
  assert.match(lessons[4], /totalMass.*centerOfMass.*weightedPosition/is);
  assert.match(lessons[5], /opening criterion.*theta.*approximatedNodes.*exactInteractions/is);
  assert.match(lessons[6], /node chứa target.*self-force.*everyBodyStoredOnce/is);
  assert.match(lessons[7], /direct oracle.*target set.*mean\/max relative force error/is);
  assert.match(lessons[8], /full-system acceleration pass.*N×\(N−1\).*work count/is);
  assert.match(lessons[9], /CTest.*Debug.*Release.*Project 32.*memory layout/is);

  const core = await readFile(path.join(source, "source-template", "include", "lab.hpp"), "utf8");
  const tree = await readFile(path.join(source, "source-template", "include", "tree.hpp"), "utf8");
  const analysis = await readFile(
    path.join(source, "source-template", "include", "analysis.hpp"),
    "utf8",
  );
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "barnes-hut-nbody-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "makeGalaxyBodies",
    "softenedAcceleration",
    "directAcceleration",
    "planFixedSteps",
    "integrateSymplecticEuler",
  ]) {
    assert.ok(core.includes(symbol), `Project 31 core header is missing ${symbol}`);
  }
  for (const symbol of [
    "buildMassOctree",
    "accumulateNodeMass",
    "barnesHutAcceleration",
    "inspectMassOctree",
  ]) {
    assert.ok(tree.includes(symbol), `Project 31 tree header is missing ${symbol}`);
  }
  for (const symbol of [
    "measureThetaAccuracy",
    "makeScalingStudy",
    "systemDiagnostics",
    "validateBarnesHutExperiment",
  ]) {
    assert.ok(analysis.includes(symbol), `Project 31 analysis header is missing ${symbol}`);
  }
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(tests, /one-body Barnes-Hut has zero self force/);
  assert.match(tests, /direct work is exactly N times N-1/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Chạy scaling study/);
  assert.match(canvas, /Sai số lực tại body đang theo dõi/);
});
