import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

test("Project 40 publishes a nine-checkpoint GPU spatial-grid workbench", async () => {
  const catalog = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const project = catalog.find((entry) => entry.id === "40");
  assert.equal(project.slug, "gpu-spatial-grid-neighbors");
  assert.equal(project.sourceDirectory, "project-40-gpu-spatial-grid-neighbors");
  assert.equal(project.checkpointCount, 9);
  assert.equal(project.demoId, "gpu-spatial-grid-neighbors");
});

test("Project 40 teaches a GPU-built CSR grid instead of uploading CPU buckets", async () => {
  const content = path.join(workspace, "content", "gpu-spatial-grid-neighbors");
  const source = path.join(workspace, "examples", "project-40-gpu-spatial-grid-neighbors");
  const lessonFiles = [
    "01-khoa-hop-dong-grid-va-neighbor.mdx",
    "02-dem-particles-bang-atomic.mdx",
    "03-bien-counts-thanh-offsets.mdx",
    "04-scatter-vao-grid-csr.mdx",
    "05-duyet-candidate-cells-tren-gpu.mdx",
    "06-loc-neighbor-va-chon-nearest.mdx",
    "07-noi-pass-graph-bang-barrier.mdx",
    "08-validation-va-benchmark-co-gioi-han.mdx",
    "09-hoan-thien-gpu-grid-workbench.mdx",
  ];
  const lessons = await Promise.all(
    lessonFiles.map((file) => readFile(path.join(content, file), "utf8")),
  );
  const contracts = [
    [/row-major/i, /NeighborSummary/i, /tie-break/i, /CPU brute-force oracle/i],
    [/atomicAdd/i, /3\.907/i, /189/i, /lost update/i],
    [/exclusive scan/i, /9\.216/i, /18 block sums/i, /offset.*count/i],
    [/cellCursors/i, /sortedIndices/i, /atomic scatter/i, /membership/i],
    [/candidate cell range/i, /radius/i, /3×3/i, /visitedCandidates/i],
    [/distance squared/i, /self/i, /nearest/i, /index nhỏ hơn/i],
    [/GL_SHADER_STORAGE_BARRIER_BIT/i, /GL_BUFFER_UPDATE_BARRIER_BIT/i, /PassRecord/i, /consumer/i],
    [/32 query/i, /GL_QUERY_RESULT_AVAILABLE/i, /chín/i, /candidate-work budget/i, /timeout 20/i],
    [/Toàn bộ mã nguồn/i, /transaction/i, /Project 41/i, /cleanup/i],
  ];
  for (const [index, patterns] of contracts.entries()) {
    for (const pattern of patterns) {
      assert.match(lessons[index], pattern, `Project 40 lesson ${index + 1} is missing ${pattern}`);
    }
  }

  const math = await readFile(
    path.join(source, "source-template", "include", "grid_math.hpp"),
    "utf8",
  );
  const scan = await readFile(
    path.join(source, "source-template", "include", "gpu_scan.hpp"),
    "utf8",
  );
  const engine = await readFile(
    path.join(source, "source-template", "include", "gpu_grid_engine.hpp"),
    "utf8",
  );
  const countShader = await readFile(
    path.join(source, "source-template", "shaders", "count_cells.comp"),
    "utf8",
  );
  const scatterShader = await readFile(
    path.join(source, "source-template", "shaders", "scatter_indices.comp"),
    "utf8",
  );
  const neighborShader = await readFile(
    path.join(source, "source-template", "shaders", "find_neighbors.comp"),
    "utf8",
  );
  const main = await readFile(path.join(source, "source-template", "src", "main.cpp"), "utf8");
  const tests = await readFile(path.join(source, "tests", "tests.cpp"), "utf8");
  const canvas = await readFile(
    path.join(workspace, "components", "labs", "gpu-spatial-grid-neighbors-lab.tsx"),
    "utf8",
  );

  for (const symbol of [
    "makeGridSpec",
    "cellId",
    "bruteForceNeighbor",
    "exclusiveScanCpu",
    "buildCsrCpu",
    "candidateCellRange",
    "queryCsrNeighbor",
    "validateCsr",
    "estimateNeighborWork",
  ]) {
    assert.ok(math.includes(symbol), `Project 40 math source is missing ${symbol}`);
  }
  assert.match(scan, /runExclusiveScanGpu/);
  assert.match(scan, /GL_SHADER_STORAGE_BARRIER_BIT/);
  for (const symbol of [
    "dispatchClear",
    "dispatchCount",
    "dispatchPrepareCursors",
    "dispatchScatter",
    "dispatchNeighbors",
    "TimerQueryRing",
    "GL_QUERY_RESULT_AVAILABLE",
  ]) {
    assert.ok(engine.includes(symbol), `Project 40 engine is missing ${symbol}`);
  }
  assert.match(countShader, /atomicAdd\(cellCounts\[cell\], 1u\)/);
  assert.match(scatterShader, /atomicAdd\(cellCursors\[cell\], 1u\)/);
  assert.match(neighborShader, /candidateDistanceSquared > radiusSquared/);
  assert.match(neighborShader, /candidate == particle/);
  assert.match(main, /1'000'003U/);
  assert.match(main, /benchmarkSubmitted < kBenchmarkSampleCount/);
  assert.match(main, /kBenchmarkTimeoutNanoseconds/);
  assert.match(main, /engine\.destroy\(gl\)/);
  assert.match(tests, /bounds guard rejects 189 tail invocations/);
  assert.match(canvas, /setPointerCapture\(event\.pointerId\)/);
  assert.match(canvas, /useReducedMotion/);
  assert.match(canvas, /Canvas 2D không phải phép đo GPU/);
  assert.match(canvas, /moveDraggedPoint/);
  assert.match(canvas, /Count \{index\}/);
  assert.match(canvas, /Arrival order/);
  assert.match(canvas, /LOST UPDATE/);
});
