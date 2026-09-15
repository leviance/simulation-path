import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace, authoredLessons, render } from "./site-support.mjs";

test("Project 41 and 42 lesson routes render independently within the response budget", async () => {
  const projects = new Set(["lennard-jones-pair", "molecular-dynamics-cpu"]);
  for (const project of projects) {
    const response = await render(`/projects/${project}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  }
  const lessons = (await authoredLessons()).filter((lesson) => projects.has(lesson.project));
  assert.equal(lessons.length, 15);
  for (const lesson of lessons) {
    const response = await render(lesson.route);
    assert.equal(response.status, 200, lesson.route);
    const html = await response.text();
    assert.ok(Buffer.byteLength(html) < 300 * 1024, `${lesson.route} exceeds the response budget`);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
  }
});

test("Project 42 publishes an eight-checkpoint CPU Molecular Dynamics lab", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "42");
  assert.equal(project.slug, "molecular-dynamics-cpu");
  assert.equal(project.sourceDirectory, "project-42-molecular-dynamics-cpu");
  assert.equal(project.checkpointCount, 8);
  assert.equal(project.demoId, "molecular-dynamics-cpu");
});

test("Project 42 connects initialization, all-pairs dynamics and bounded validation", async () => {
  const content = path.join(workspace, "content", "molecular-dynamics-cpu");
  const source = path.join(workspace, "examples", "project-42-molecular-dynamics-cpu");
  const lessonFiles = [
    "01-xep-1000-hat-vao-hop.mdx",
    "02-gan-van-toc-theo-nhiet-do.mdx",
    "03-lam-muot-luc-tai-cutoff.mdx",
    "04-quet-moi-cap-va-cong-luc.mdx",
    "05-tich-phan-va-phan-xa-o-thanh-hop.mdx",
    "06-do-nhiet-do-va-nang-luong.mdx",
    "07-do-chi-phi-o-n-binh-phuong.mdx",
    "08-hoan-thien-cpu-molecular-dynamics-lab.mdx",
  ];
  const lessons = await Promise.all(
    lessonFiles.map((file) => readFile(path.join(content, file), "utf8")),
  );
  const contracts = [
    [/MolecularSystem/i, /number density/i, /lattice/i, /jitter/i],
    [/2N-2/i, /centerVelocity/i, /targetEnergy/i, /tổng động lượng/i],
    [/force-shifted/i, /U_\{fs\}/i, /atCutoff/i, /cân bằng/i, /phóng/i],
    [/499\.500/i, /second = first \+ 1U/i, /activePairs/i, /evaluation\.forces\[second\]/i],
    [/velocityVerletStep/i, /reflectCoordinate/i, /candidate/i, /overshoot/i],
    [/SystemMetrics/i, /relativeEnergyDrift/i, /180 mẫu/i, /2N-2/i],
    [/999\.000/i, /maximumSteps/i, /droppedTime/i, /Project 44/i],
    [/Mã nguồn hoàn chỉnh/i, /validateMolecularDynamics/i, /timeout 20/i, /Project 43/i],
  ];
  for (const [index, patterns] of contracts.entries()) {
    for (const pattern of patterns) {
      assert.match(lessons[index], pattern, `Project 42 lesson ${index + 1} is missing ${pattern}`);
    }
    const lesson = lessons[index];
    for (const heading of [
      "Vấn đề cần giải quyết",
      "Hiểu ý tưởng trước khi viết code",
      "Viết code từng bước",
      "Ghép các phần lại",
      "Thử làm sai để hiểu đúng",
      "Tự kiểm tra kết quả",
      "Bài tập mở rộng",
    ]) {
      assert.ok(lesson.includes(`## ${heading}`), `Lesson ${index + 1} needs ${heading}`);
    }
    const experiments = lesson
      .split("## Thử làm sai để hiểu đúng")[1]
      .split("## Tự kiểm tra kết quả")[0];
    assert.ok(
      (experiments.match(/^\d+\. /gm) ?? []).length >= 2,
      `Lesson ${index + 1} needs distinct experiments`,
    );
    for (const block of lesson.matchAll(/```cpp[^\n]*\n([\s\S]*?)\n```/g)) {
      for (const line of block[1].split(/\r?\n/)) {
        const indentation = line.match(/^ +(?=\S)/)?.[0].length ?? 0;
        assert.equal(indentation % 4, 0, `Lesson ${index + 1} has non-four-space indentation`);
        assert.ok(!line.includes("\t"), `Lesson ${index + 1} uses a tab`);
      }
    }
  }

  const math = await readFile(
    path.join(source, "source-template", "include", "molecular_dynamics.hpp"),
    "utf8",
  );
  const ui = await readFile(
    path.join(source, "source-template", "include", "molecular_dynamics_ui.hpp"),
    "utf8",
  );
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "molecular-dynamics-cpu-lab.tsx"),
    "utf8",
  );
  const canvasMath = await readFile(
    path.join(workspace, "lib", "labs", "molecular-dynamics-cpu.ts"),
    "utf8",
  );

  for (const symbol of [
    "createLatticeParticles",
    "assignThermalVelocities",
    "sampleForceShiftedPair",
    "accumulatePairForces",
    "reflectCoordinate",
    "velocityVerletStep",
    "measureSystem",
    "estimateAllPairsWork",
    "validateMolecularDynamics",
  ]) {
    assert.ok(math.includes(symbol), `Project 42 math source is missing ${symbol}`);
    assert.ok(canvasMath.includes(symbol), `Project 42 Canvas math is missing ${symbol}`);
  }
  assert.match(math, /for \(std::size_t second = first \+ 1U/);
  assert.match(math, /sample\.potentialSlope - atCutoff\.potentialSlope/);
  assert.match(math, /evaluation\.forces\[second\] = subtract/);
  assert.match(main, /maximumSteps = 1/);
  assert.match(main, /droppedTime \+= plan\.droppedTime/);
  assert.match(main, /SDL_DestroyTexture\(texture\)/);
  assert.match(ui, /drawEnergyHistory/);
  assert.match(tests, /one thousand particles have 499500 pairs/);
  assert.match(tests, /bounded stress run finishes within five hundred steps/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /1\.000/);
  assert.match(canvas, /2 \* metrics\.evaluatedPairs/);
  assert.match(canvas, /Kiểm chứng mô hình chuẩn/);
  assert.match(main, /SDLK_D/);
  assert.match(main, /drawDiagnostics/);
  assert.match(main, /velocityVerletStep\(system, fixedDt, &forceEvaluation\)/);
  assert.match(main, /measureSystem\(system, forceEvaluation\)/);
  assert.match(math, /thermalEnergy/);
  assert.match(math, /report\.wallEvents > 0U/);
  assert.match(lessons[5], /K_\{thermal\}/);
  assert.match(lessons[7], /measureRun/);
});
