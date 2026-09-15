import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 41 publishes a seven-checkpoint Lennard-Jones pair lab", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "41");
  assert.equal(project.slug, "lennard-jones-pair");
  assert.equal(project.sourceDirectory, "project-41-lennard-jones-pair");
  assert.equal(project.checkpointCount, 7);
  assert.equal(project.demoId, "lennard-jones-pair");
});

test("Project 41 connects potential force integration and validation", async () => {
  const content = path.join(workspace, "content", "lennard-jones-pair");
  const source = path.join(workspace, "examples", "project-41-lennard-jones-pair");
  const lessonFiles = [
    "01-dung-cap-nguyen-tu-va-khoang-cach.mdx",
    "02-doc-duong-cong-the-lennard-jones.mdx",
    "03-tu-do-doc-the-nang-den-luc.mdx",
    "04-cong-cap-luc-va-giu-tam-khoi-luong.mdx",
    "05-cho-hai-nguyen-tu-chay-bang-velocity-verlet.mdx",
    "06-do-nang-luong-va-chon-buoc-thoi-gian.mdx",
    "07-hoan-thien-lennard-jones-pair-lab.mdx",
  ];
  const lessons = await Promise.all(
    lessonFiles.map((file) => readFile(path.join(content, file), "utf8")),
  );
  const contracts = [
    [/PairState/i, /world space/i, /center of mass/i, /reduced units/i],
    [/U\(sigma\)/i, /2\^\{1\/6\}/i, /samplePotential/i, /singularity/i],
    [/dU/i, /potentialSlope/i, /sai phân trung tâm/i, /forceOnB/i],
    [/Newton/i, /linear momentum/i, /unordered pair/i, /centerOfMassVelocity/i],
    [/Velocity Verlet/i, /a0 → x1 → a1 → v1/i, /accumulator/i, /32 substep/i],
    [/kinetic/i, /relativeEnergyDrift/i, /20\.000 step/i, /600 mẫu/i, /assessExperiment/i],
    [/Toàn bộ mã nguồn/i, /SDL_CaptureMouse/i, /ValidationReport/i, /Project 42/i],
  ];
  for (const [index, patterns] of contracts.entries()) {
    for (const pattern of patterns) {
      assert.match(lessons[index], pattern, `Project 41 lesson ${index + 1} is missing ${pattern}`);
    }
  }

  const math = await readFile(
    path.join(source, "source-template", "include", "lennard_jones.hpp"),
    "utf8",
  );
  const ui = await readFile(
    path.join(source, "source-template", "include", "lennard_jones_ui.hpp"),
    "utf8",
  );
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "lennard-jones-pair-lab.tsx"),
    "utf8",
  );
  const canvasRenderer = await readFile(
    path.join(workspace, "components", "labs", "lennard-jones-pair-render.ts"),
    "utf8",
  );

  for (const symbol of [
    "samplePotential",
    "equilibriumDistance",
    "evaluatePair",
    "accumulatePairForces",
    "velocityVerletStep",
    "measureSystem",
    "relativeEnergyDrift",
    "validateModel",
  ]) {
    assert.ok(math.includes(symbol), `Project 41 math source is missing ${symbol}`);
  }
  assert.match(math, /forceOnB = scale\(forceOnA, -1\.0\)/);
  assert.match(math, /sample\.ratio6 - 2\.0 \* sample\.ratio12/);
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /planFixedSteps/);
  assert.match(ui, /drawPotentialSlopeGraph/);
  assert.match(main, /restartExperiment/);
  assert.match(ui, /enum class ValidationState/);
  assert.match(main, /lj_ui::ValidationState::failed/);
  assert.match(ui, /INVALID: energy/);
  assert.match(main, /kMaximumHistorySamples = 600/);
  assert.match(main, /SDL_DestroyTexture\(texture\)/);
  assert.match(tests, /20-unit stress run/);
  assert.match(tests, /Project 41 validation passed/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvasRenderer, /Fₐ·d̂ = dU\/dr/);
  assert.match(canvas, /Độ trôi tâm khối lượng/);
  assert.match(canvas, /các\s+giá trị U và F đưa vào mô phỏng\s+vẫn được giữ nguyên/);
});
