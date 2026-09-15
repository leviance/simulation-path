import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 23 publishes a seven-checkpoint integrator race", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "23");
  assert.equal(project.slug, "integrator-race");
  assert.equal(project.sourceDirectory, "project-23-integrator-race");
  assert.equal(project.checkpointCount, 7);
  assert.equal(project.demoId, "integrator-race");
});

test("Project 23 teaches one fair oscillator experiment from model to convergence", async () => {
  const content = path.join(workspace, "content", "integrator-race");
  const source = path.join(workspace, "examples", "project-23-integrator-race");
  const system = await readFile(
    path.join(content, "01-dung-duong-dua-harmonic-oscillator.mdx"),
    "utf8",
  );
  const euler = await readFile(
    path.join(content, "02-explicit-euler-thi-sinh-dau-tien.mdx"),
    "utf8",
  );
  const verlet = await readFile(
    path.join(content, "03-velocity-verlet-va-hai-lan-tinh-luc.mdx"),
    "utf8",
  );
  const rk4 = await readFile(path.join(content, "04-rk4-va-bon-lan-tham-slope.mdx"), "utf8");
  const lockstep = await readFile(
    path.join(content, "05-cho-ba-integrator-chay-lockstep.mdx"),
    "utf8",
  );
  const metrics = await readFile(
    path.join(content, "06-do-phase-error-va-energy-drift.mdx"),
    "utf8",
  );
  const validation = await readFile(
    path.join(content, "07-stress-test-convergence-va-nghiem-thu.mdx"),
    "utf8",
  );
  assert.match(system, /x\(t\).*cos.*sin/s);
  assert.match(system, /SDL3.*ba đường ray/is);
  assert.match(euler, /position.*velocity.*đầu bước/is);
  assert.match(verlet, /a_0.*x_1.*a_1.*v_1/is);
  assert.match(rk4, /k_1.*k_2.*k_3.*k_4/is);
  assert.match(lockstep, /same|cùng initial state.*cùng parameters.*fixed `dt`.*step count/is);
  assert.match(metrics, /velocity difference.*angular frequency/is);
  assert.match(validation, /2, 4 và 16|2\/4\/16/);

  const header = await readFile(path.join(source, "source-template", "include", "lab.hpp"), "utf8");
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "integrator-race-lab.tsx"),
    "utf8",
  );
  assert.match(header, /analyticOscillatorState/);
  assert.match(header, /explicitEulerStep/);
  assert.match(header, /velocityVerletStep/);
  assert.match(header, /rungeKutta4Step/);
  assert.match(header, /stepIntegratorRace/);
  assert.match(header, /integratorMetrics/);
  assert.match(header, /runIntegrator/);
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /SDL_UpdateTexture/);
  assert.match(tests, /first-order convergence/);
  assert.match(tests, /fourth-order convergence/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /drawPhaseInspector/);
  assert.match(canvas, /RK4 · k₄ tại cuối bước/);
  assert.match(canvas, /phaseSpaceError/);
});
