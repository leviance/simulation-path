import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 39 publishes a ten-checkpoint reduction and prefix-sum workbench", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "39");
  assert.equal(project.slug, "gpu-reduction-prefix-sum");
  assert.equal(project.sourceDirectory, "project-39-gpu-reduction-prefix-sum");
  assert.equal(project.checkpointCount, 10);
  assert.equal(project.demoId, "gpu-reduction-prefix-sum");
});

test("Project 39 teaches a traceable hierarchy instead of a serial GPU loop", async () => {
  const content = path.join(workspace, "content", "gpu-reduction-prefix-sum");
  const source = path.join(workspace, "examples", "project-39-gpu-reduction-prefix-sum");
  const lessonFiles = [
    "01-hai-dau-ra-hai-hop-dong.mdx",
    "02-ve-cay-pass-va-phan-duoi.mdx",
    "03-reduction-trong-mot-workgroup.mdx",
    "04-reduction-phan-cap-den-mot-scalar.mdx",
    "05-blelloch-exclusive-scan.mdx",
    "06-scan-tung-block-va-giu-block-sum.mdx",
    "07-scan-de-quy-va-uniform-add.mdx",
    "08-barrier-va-vong-doi-buffer.mdx",
    "09-validation-va-gpu-timing.mdx",
    "10-hoan-thien-reduction-scan-workbench.mdx",
  ];
  const lessons = await Promise.all(
    lessonFiles.map((file) => readFile(path.join(content, file), "utf8")),
  );
  const contracts = [
    [/exclusive scan/i, /\[0,3,4,8\]/i, /double/i, /CPU oracle/i],
    [/1\.000\.003/i, /1\.954/i, /445/i, /zero padding/i],
    [/shared memory/i, /stride/i, /barrier/i, /2\.048 byte/i],
    [/scratch A/i, /scratch B/i, /GL_SHADER_STORAGE_BARRIER_BIT/i, /scalar/i],
    [/Blelloch/i, /upsweep/i, /downsweep/i, /root/i],
    [/local prefix/i, /block sums/i, /binding 0\/1\/2/i, /1\.954/i],
    [/uniform add/i, /scan L1/i, /index \/ 512/i, /năm dispatch/i],
    [/memoryBarrierShared/i, /GL_BUFFER_UPDATE_BARRIER_BIT/i, /consumer/i, /PassRecord/i],
    [/mixed tolerance/i, /first mismatch/i, /GL_QUERY_RESULT_AVAILABLE/i, /timeout 20/i],
    [/Toàn bộ mã nguồn/i, /đúng chín/i, /Project 40/i, /cleanup/i],
  ];
  for (const [index, patterns] of contracts.entries()) {
    for (const pattern of patterns) {
      assert.match(lessons[index], pattern, `Project 39 lesson ${index + 1} is missing ${pattern}`);
    }
  }

  const math = await readFile(
    path.join(source, "source-template", "include", "reduction_math.hpp"),
    "utf8",
  );
  const engine = await readFile(
    path.join(source, "source-template", "include", "reduction_gpu_engine.hpp"),
    "utf8",
  );
  const reductionShader = await readFile(
    path.join(source, "source-template", "shaders", "reduce.comp"),
    "utf8",
  );
  const scanShader = await readFile(
    path.join(source, "source-template", "shaders", "scan_blocks.comp"),
    "utf8",
  );
  const uniformShader = await readFile(
    path.join(source, "source-template", "shaders", "uniform_add.comp"),
    "utf8",
  );
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "gpu-reduction-prefix-sum-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "cpuReduction",
    "cpuExclusiveScan",
    "makeHierarchy",
    "scanDispatchCount",
    "validateReduction",
    "validateExclusiveScan",
  ]) {
    assert.ok(math.includes(symbol), `Project 39 math source is missing ${symbol}`);
  }
  for (const symbol of [
    "runReduction",
    "runExclusiveScan",
    "dispatchUniformAdd",
    "GL_SHADER_STORAGE_BARRIER_BIT",
    "GL_BUFFER_UPDATE_BARRIER_BIT",
    "GL_QUERY_RESULT_AVAILABLE",
    "TimerQueryRing",
  ]) {
    assert.ok(engine.includes(symbol), `Project 39 engine is missing ${symbol}`);
  }
  assert.match(reductionShader, /shared float sharedValues\[512\]/);
  assert.match(reductionShader, /stride = 256u/);
  assert.match(scanShader, /temporary\[511\] = 0\.0/);
  assert.match(scanShader, /upsweep/i);
  assert.match(scanShader, /downsweep/i);
  assert.match(uniformShader, /index \/ 512u/);
  assert.match(main, /1'000'003U/);
  assert.match(main, /benchmarkSubmitted < kBenchmarkSampleCount/);
  assert.match(main, /kBenchmarkTimeoutNanoseconds/);
  assert.match(main, /engine\.destroy\(gl\)/);
  assert.match(tests, /tail loads 445 zero padding values/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Canvas 2D không phải phép đo GPU/);
  assert.match(canvas, /Inclusive Scan \(để so sánh\)/);
  assert.match(canvas, /Block span/);
  assert.match(canvas, /Bỏ barrier \(mô hình stale read\)/);
});
