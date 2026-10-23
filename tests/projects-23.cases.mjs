import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-23-integrator-race");
const content = path.join(workspace, "content/integrator-race");
const read = (file) => readFile(path.join(root, file), "utf8");

test("Project 23 teaches eight runnable stages with exact, balanced, highlighted code", async () => {
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  const project = catalog.find((entry) => entry.id === "23");
  assert.equal(project.slug, "integrator-race");
  assert.equal(project.sourceDirectory, "project-23-integrator-race");
  assert.equal(project.checkpointCount, 8);
  assert.equal(project.demoId, "integrator-race");
  const lessons = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(lessons.length, 8);
  for (const [index, file] of lessons.entries()) {
    const mdx = await readFile(path.join(content, file), "utf8");
    let count = 0;
    for (const [, title, snippet] of mdx.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      const source = await read(
        relative.startsWith("tests/")
          ? relative
          : `checkpoints/${String(index + 1).padStart(2, "0")}/${relative}`,
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), `${file}: ${title}`);
      const stack = [],
        pairs = { ")": "(", "]": "[", "}": "{" };
      for (const token of codeTokens(snippet)) {
        if (["(", "[", "{"].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token)) assert.equal(stack.pop(), pairs[token], title);
      }
      assert.equal(stack.length, 0, title);
      count++;
    }
    assert.ok(count >= 3, file);
    assert.match(mdx, /project_23_starter/);
    assert.ok((mdx.match(/^### Bước /gm) ?? []).length >= 3, file);
    assert.doesNotMatch(mdx, /Checkpoint đang xây|TODO|error per evaluation/);
    const compiled = String(await compile(mdx, courseMdxOptions));
    assert.match(compiled, /one-dark-pro/);
    assert.doesNotMatch(compiled, /_missingMdxReference\("InteractiveLab"/);
  }
});

test("Project 23 stages add real algorithms, per-step history, runtime selection and cooperative benchmark", async () => {
  for (const [step, file, absent] of [
    ["starter", "lab.hpp", "angularFrequency"],
    ["checkpoints/01", "lab.hpp", "explicitEulerStep"],
    ["checkpoints/02", "lab.hpp", "velocityVerletStep"],
    ["checkpoints/03", "lab.hpp", "rungeKutta4Step"],
    ["checkpoints/04", "lab.hpp", "stepIntegratorRace"],
    ["checkpoints/05", "lab.hpp", "integratorMetrics"],
    ["checkpoints/06", "lab.hpp", "runIntegrator("],
    ["checkpoints/07", "benchmark.hpp", "runBenchmarkWork"],
  ])
    assert.ok(
      !(await read(`${step}/include/${file}`)).includes(absent),
      `${step}: future ${absent}`,
    );
  const header = await read("final/include/lab.hpp");
  for (const name of [
    "analyticOscillatorState",
    "explicitEulerStep",
    "velocityVerletStep",
    "rungeKutta4Step",
    "stepIntegratorRace",
    "integratorMetrics",
    "runIntegrator",
  ])
    assert.ok(header.includes(name), name);
  assert.match(header, /count > 10000/);
  const scene = await read("final/include/scene.hpp");
  assert.match(scene, /kHistoryLimit = 1201/);
  assert.match(scene, /recordSample\(scene\)/);
  assert.match(scene, /128/);
  assert.match(scene, /cycleLane/);
  const bench = await read("final/include/benchmark.hpp");
  assert.match(bench, /volatile double inputPosition/);
  assert.match(bench, /std::chrono::steady_clock::now/);
  assert.match(bench, /std::chrono::seconds\(5\)/);
  assert.match(bench, /median\(job.timings\)/);
  const main = await read("final/src/main.cpp");
  assert.match(main, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(main, /SDL_CaptureMouse\(true\)/);
  assert.match(main, /active = active \|\| scene.benchmark.running/);
  assert.match(main, /frames >= 40/);
  assert.match(main, /SDL_Delay\(16\)/);
  assert.doesNotMatch(main, /Box2D|glDraw|glm::/);
  const nativeTests = await read("tests/tests.cpp");
  assert.match(nativeTests, /independent recurrence/);
  assert.match(nativeTests, /first\/second\/fourth-order convergence/);
  const canvas = await readFile(
    path.join(workspace, "components/labs/integrator-race-lab.tsx"),
    "utf8",
  );
  assert.match(canvas, /setPointerCapture\(event.pointerId\)/);
  assert.match(canvas, /usePauseOnReducedMotion/);
  assert.match(canvas, /advanceIntegratorBenchmark/);
  assert.match(canvas, /disposed = true/);
  const metricsLesson = await readFile(
    path.join(content, "06-do-phase-error-va-energy-drift.mdx"),
    "utf8",
  );
  assert.match(metricsLesson, /không phải sai số góc pha/i);
  const finalLesson = await readFile(
    path.join(content, "08-do-runtime-va-hoan-thien-cuoc-dua.mdx"),
    "utf8",
  );
  assert.match(
    finalLesson,
    /target_include_directories\(project_23_tests PRIVATE starter\/include\)/,
  );
  assert.match(finalLesson, /JavaScript.*không.*C\+\+|C\+\+.*JavaScript/is);
});

test("Project 23 overview and all eight lessons expose complete source and downloads", async () => {
  const overview = await render("/projects/integrator-race");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /Nếu tự làm từ đầu, bạn sẽ bắt đầu thế nào/);
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  for (const file of files) {
    const response = await render("/projects/integrator-race/" + file.slice(0, -4));
    assert.equal(response.status, 200, file);
    const html = await response.text();
    assert.match(html, /one-dark-pro/);
    if (file === files.at(-1)) {
      for (const name of await readdir(path.join(root, "source-template/include")))
        assert.ok(html.includes("include/" + name), name);
      assert.match(html, /Toàn bộ mã nguồn của dự án/);
      assert.match(html, /project-23-integrator-race.zip/);
    }
  }
});
