import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { lessonSectionUsages } from "../scripts/mdx-contracts.mjs";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { workspace } from "./site-support.mjs";

const projectRoot = path.join(workspace, "examples/project-37-million-vector-gpu");
const contentRoot = path.join(workspace, "content/million-vector-gpu");
const source = (file, checkpoint = "final") =>
  readFile(path.join(projectRoot, checkpoint, file), "utf8");

test("Project 37 publishes eleven staged checkpoints with isolated shader fallbacks", async () => {
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  const project = catalog.find((entry) => entry.id === "37");
  assert.equal(project.slug, "million-vector-gpu");
  assert.equal(project.sourceDirectory, "project-37-million-vector-gpu");
  assert.equal(project.checkpointCount, 11);
  assert.equal(project.contentRevision, 2);
  assert.equal(project.shaderRuntimePerTarget, true);
  const files = (await readdir(contentRoot)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(files.length, project.checkpointCount);
  assert.deepEqual(
    files.map((file) => Number(file.slice(0, 2))),
    Array.from({ length: 11 }, (_, index) => index + 1),
  );
});

test("every rebuilt Project 37 lesson compiles real MDX and has seven teaching roles", async () => {
  for (const file of (await readdir(contentRoot)).filter((file) => file.endsWith(".mdx"))) {
    const mdx = await readFile(path.join(contentRoot, file), "utf8");
    assert.deepEqual(
      lessonSectionUsages(mdx).map(({ key }) => key),
      ["problem", "model", "code", "assembly", "experiments", "validation", "extensions"],
      file,
    );
    await compile(mdx, courseMdxOptions);
    const checkpoint = "checkpoints/" + file.slice(0, 2);
    for (const match of mdx.matchAll(/```(?:cpp|glsl) title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g)) {
      const relative = match[1].split(" — ")[0];
      const actual = await source(relative, checkpoint);
      assert.ok(
        isContiguousCodeExcerpt(match[2], actual),
        `${file}: non-contiguous or drifting snippet ${relative}`,
      );
    }
  }
});

test("Project 37 milestones introduce real dispatch, readback, validation and per-N timing in order", async () => {
  const at = (number, file) => source(file, "checkpoints/" + String(number).padStart(2, "0"));
  assert.doesNotMatch(await at(3, "include/vector_compute_engine.hpp"), /api\.DispatchCompute\(/);
  assert.match(
    await at(4, "include/vector_compute_engine.hpp"),
    /const GLuint workgroupCount = 1U;/,
  );
  assert.doesNotMatch(await at(4, "shaders/vector_ops.comp"), /uElementCount/);
  const shader = await at(5, "shaders/vector_ops.comp");
  const guard = shader.indexOf("index >= uint(uElementCount)");
  const firstRead = shader.indexOf("inputA[index]");
  assert.ok(guard > 0 && guard < firstRead, "tail guard must precede all data reads");
  assert.doesNotMatch(
    await at(5, "include/vector_compute_engine.hpp"),
    /api\.GetBufferSubData\(GL_SHADER_STORAGE_BUFFER, 0, byteCount\(\), readback_\.data\(\)\)/,
  );
  assert.match(
    await at(6, "include/vector_compute_engine.hpp"),
    /api\.MemoryBarrier\(GL_BUFFER_UPDATE_BARRIER_BIT\)/,
  );
  assert.doesNotMatch(
    await at(6, "include/compute_worker.hpp"),
    /data->validation = validateOutput/,
  );
  assert.match(await at(7, "include/compute_worker.hpp"), /data->validation = validateOutput/);
  assert.doesNotMatch(await at(7, "include/vector_compute_engine.hpp"), /api\.BeginQuery/);
  const engine = await at(8, "include/vector_compute_engine.hpp");
  assert.match(
    engine,
    /BeginQuery\(GL_TIME_ELAPSED, timerQuery_\);\s*api\.DispatchCompute\(workgroupCount, 1, 1\);\s*api\.EndQuery/,
  );
  assert.match(
    engine,
    /while \(available != GL_TRUE\)[\s\S]*checkWaitBudget[\s\S]*GL_QUERY_RESULT_AVAILABLE/,
  );
  assert.ok(
    engine.indexOf("GL_QUERY_RESULT,") < engine.indexOf("timerPending_ = false;"),
    "query must be consumed before reuse",
  );
  assert.doesNotMatch(await at(8, "include/compute_worker.hpp"), /counts\.assign\(benchmarkCounts/);
  assert.match(await at(9, "include/compute_worker.hpp"), /counts\.assign\(benchmarkCounts/);
  assert.doesNotMatch(await at(9, "include/compute_application.hpp"), /key == SDLK_PAGEUP/);
  assert.match(await at(10, "include/compute_application.hpp"), /key == SDLK_PAGEUP/);
  assert.doesNotMatch(await at(10, "include/compute_verify.hpp"), /inline bool verifyCompute/);
  assert.match(await at(11, "include/compute_verify.hpp"), /inline bool verifyCompute/);
});

test("Project 37 keeps job snapshots, finite waits and explicit timing scopes", async () => {
  const worker = await source("include/compute_worker.hpp");
  assert.match(worker, /\[this, config, benchmark\]\(std::stop_token stop\)/);
  assert.match(worker, /std::chrono::seconds\(15\)/);
  assert.match(worker, /std::lock_guard lock\(mutex_\)/);
  const benchmark = await source("include/compute_benchmark.hpp");
  assert.match(benchmark, /benchmarkWarmupCount = 2U/);
  assert.match(benchmark, /benchmarkSampleCount = 9U/);
  assert.match(benchmark, /256U, 65'537U, 1'000'003U/);
  for (const field of [
    "cpuMilliseconds",
    "kernelMilliseconds",
    "endToEndMilliseconds",
    "minimum",
    "median",
    "maximum",
  ]) {
    assert.ok(benchmark.includes(field), field);
  }
  const dashboard = await source("include/compute_dashboard.hpp");
  assert.match(dashboard, /MEASURED:/);
  assert.match(dashboard, /SELECTED:/);
  assert.match(dashboard, /CPU LOOP/);
  assert.match(dashboard, /END-TO-END/);
  const engine = await source("include/vector_compute_engine.hpp");
  assert.match(engine, /std::chrono::seconds\(3\)/);
  assert.match(engine, /ClientWaitSync\(fence, 0, 0\)/);
  assert.ok(
    engine.indexOf("totalBegin =") <
      engine.indexOf("uploadInputs(api);", engine.indexOf("totalBegin =")),
  );
  assert.ok(engine.indexOf("result.endToEndMilliseconds =") > engine.indexOf("readback_.data()"));
});

test("Project 37 GPU verification covers known answers, large odd N, input preservation and fault detection", async () => {
  const verification = await source("include/compute_verify.hpp");
  assert.match(verification, /1U, 255U, 256U, 257U, 65'537U, 1'000'003U/);
  assert.match(verification, /std::array<Vec4, 3> known/);
  assert.match(verification, /engine\.inputsUnchanged\(api\)/);
  assert.match(verification, /check\(!corrupt.tailIntact/);
  assert.match(verification, /wrongGuard\.replace/);
  assert.match(verification, /wrongBinding\.replace/);
  const tests = await source("tests/tests.cpp", ".");
  assert.match(tests, /mismatched A\/B is rejected/);
  assert.match(tests, /NaN tolerance/);
  assert.match(tests, /Infinity/);
  assert.match(tests, /component < 4/);
  assert.doesNotMatch(tests, /\bassert\(/);
});
