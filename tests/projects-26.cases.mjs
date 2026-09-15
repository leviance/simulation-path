import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 26 publishes a seven-checkpoint double-pendulum experiment", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "26");
  assert.equal(project.slug, "double-pendulum-chaos");
  assert.equal(project.sourceDirectory, "project-26-double-pendulum-chaos");
  assert.equal(project.checkpointCount, 7);
  assert.equal(project.demoId, "double-pendulum-chaos");
});

test("Project 26 separates physical sensitivity from integration error", async () => {
  const content = path.join(workspace, "content", "double-pendulum-chaos");
  const source = path.join(workspace, "examples", "project-26-double-pendulum-chaos");
  const lessons = await Promise.all(
    [
      "01-bieu-dien-double-pendulum-bang-goc.mdx",
      "02-tinh-angular-acceleration-coupled.mdx",
      "03-tich-phan-rk4-va-theo-doi-energy.mdx",
      "04-chay-hai-con-lac-cung-timestep.mdx",
      "05-do-separation-trong-phase-space.mdx",
      "06-phan-biet-chaos-voi-sai-so-so-hoc.mdx",
      "07-preset-tuong-tac-va-nghiem-thu.mdx",
    ].map((file) => readFile(path.join(content, file), "utf8")),
  );

  assert.match(lessons[0], /generalized coordinates/is);
  assert.match(lessons[0], /bob position/is);
  assert.match(lessons[1], /derivative.*alpha1.*alpha2/is);
  assert.match(lessons[2], /RK4.*energy drift/is);
  assert.match(lessons[3], /perturbation.*lockstep/is);
  assert.match(lessons[4], /wrap angle.*phase-space/is);
  assert.match(lessons[5], /two half-step|hai bước.*dt\/2/is);
  assert.match(lessons[6], /Calm.*Chaotic.*Near upright/is);

  const header = await readFile(path.join(source, "source-template", "include", "lab.hpp"), "utf8");
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "double-pendulum-chaos-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "pendulumGeometry",
    "pendulumDerivative",
    "stepRk4",
    "makeTwinPendulums",
    "phaseSpaceSeparation",
    "makeChaosExperiment",
    "runChaosExperiment",
  ]) {
    assert.ok(header.includes(symbol), `Project 26 header is missing ${symbol}`);
  }
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(tests, /phase-space separation wraps the plus-minus pi seam/);
  assert.match(tests, /dt versus dt-half error stays below the intentional perturbation/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Numerical shadow separation/);
  assert.match(canvas, /Chạy nhanh 30 giây/);
});
