import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 24 publishes an eight-checkpoint collision tank", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "24");
  assert.equal(project.slug, "collision-tank");
  assert.equal(project.sourceDirectory, "project-24-collision-tank");
  assert.equal(project.checkpointCount, 8);
  assert.equal(project.demoId, "collision-tank");
});

test("Project 24 teaches detection, response and cost as separate traceable stages", async () => {
  const content = path.join(workspace, "content", "collision-tank");
  const source = path.join(workspace, "examples", "project-24-collision-tank");
  const scene = await readFile(
    path.join(content, "01-dung-be-va-dan-bong-deterministic.mdx"),
    "utf8",
  );
  const motion = await readFile(
    path.join(content, "02-cho-bong-chuyen-dong-fixed-timestep.mdx"),
    "utf8",
  );
  const walls = await readFile(path.join(content, "03-xu-ly-va-cham-voi-tuong.mdx"), "utf8");
  const detection = await readFile(
    path.join(content, "04-phat-hien-hai-hinh-tron-cham-nhau.mdx"),
    "utf8",
  );
  const impulse = await readFile(
    path.join(content, "05-doi-van-toc-bang-collision-impulse.mdx"),
    "utf8",
  );
  const correction = await readFile(
    path.join(content, "06-day-hai-bong-ra-khoi-penetration.mdx"),
    "utf8",
  );
  const pairs = await readFile(
    path.join(content, "07-duyet-moi-cap-va-giai-toan-bo-be.mdx"),
    "utf8",
  );
  const validation = await readFile(
    path.join(content, "08-stress-test-bao-toan-va-nghiem-thu.mdx"),
    "utf8",
  );
  assert.match(scene, /144.*seed|seed.*144/is);
  assert.match(motion, /accumulator.*fixedDeltaSeconds/is);
  assert.match(walls, /radius.*hướng velocity.*restitution/is);
  assert.match(detection, /squared distance.*normal.*penetration/is);
  assert.match(impulse, /relative velocity.*inverse mass.*restitution/is);
  assert.match(correction, /slop.*correctionPercent.*inverse mass/is);
  assert.match(pairs, /10[.\s]?296.*30[.\s]?888/is);
  assert.match(validation, /momentum.*kinetic energy.*stress/is);

  const header = await readFile(path.join(source, "source-template", "include", "lab.hpp"), "utf8");
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "collision-tank-lab.tsx"),
    "utf8",
  );
  for (const symbol of [
    "makeBallLattice",
    "integrateBall",
    "resolveWallCollision",
    "findCircleContact",
    "applyCollisionImpulse",
    "correctBallPenetration",
    "stepCollisionWorld",
    "measureWorld",
  ]) {
    assert.ok(header.includes(symbol), `Project 24 header is missing ${symbol}`);
  }
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(tests, /elastic equal-mass head-on/);
  assert.match(tests, /stress run preserves kinetic energy/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /makeTeachingScene/);
  assert.match(canvas, /mode === "collision-walls"/);
  assert.match(canvas, /Relative normal speed \/ impulse/);
});
