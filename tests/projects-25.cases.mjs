import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 25 publishes an eight-checkpoint spring chain", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "25");
  assert.equal(project.slug, "spring-chain");
  assert.equal(project.sourceDirectory, "project-25-spring-chain");
  assert.equal(project.checkpointCount, 8);
  assert.equal(project.demoId, "spring-chain");
});

test("Project 25 teaches topology, local force, integration and stability as traceable stages", async () => {
  const content = path.join(workspace, "content", "spring-chain");
  const source = path.join(workspace, "examples", "project-25-spring-chain");
  const lessons = await Promise.all(
    [
      "01-dung-chuoi-khoi-luong-va-lo-xo.mdx",
      "02-tinh-luc-hooke-tren-mot-lo-xo.mdx",
      "03-cong-luc-gravity-va-neo-co-dinh.mdx",
      "04-cho-chuoi-chuyen-dong-semi-implicit-euler.mdx",
      "05-them-damping-doc-truc-lo-xo.mdx",
      "06-keo-tha-mot-khoi-va-truyen-dao-dong.mdx",
      "07-thi-nghiem-stiffness-mass-va-delta-time.mdx",
      "08-do-energy-stress-test-va-nghiem-thu.mdx",
    ].map((file) => readFile(path.join(content, file), "utf8")),
  );
  assert.match(lessons[0], /18 particles.*17 springs.*inverse mass/is);
  assert.match(lessons[1], /distance.*rest length.*stretch.*force/is);
  assert.match(lessons[2], /clear.*gravity.*equal.*opposite|xóa.*gravity.*ngược/is);
  assert.match(lessons[3], /velocity.*trước.*position.*fixed/is);
  assert.match(lessons[4], /relative velocity.*dot product.*tangent/is);
  assert.match(lessons[5], /kinematic.*release velocity.*pointer capture/is);
  assert.match(lessons[6], /dt.*sqrt.*k.*m.*energy/is);
  assert.match(lessons[7], /kinetic.*spring.*gravitational.*4800/is);

  const header = await readFile(path.join(source, "source-template", "include", "lab.hpp"), "utf8");
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "spring-chain-lab.tsx"),
    "utf8",
  );
  for (const symbol of [
    "makeVerticalChain",
    "sampleElasticSpring",
    "accumulateElasticForces",
    "integrateParticle",
    "sampleDampedSpring",
    "beginDrag",
    "springStabilityIndex",
    "measureChain",
  ]) {
    assert.ok(header.includes(symbol), `Project 25 header is missing ${symbol}`);
  }
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(tests, /Hooke force uses stiffness times stretch/);
  assert.match(tests, /long spring-chain stress state stays finite/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /SpringIntegrationTrace/);
  assert.match(canvas, /Distance/);
  assert.match(canvas, /Endpoint angle/);
  assert.match(canvas, /Stability preset/);
});
