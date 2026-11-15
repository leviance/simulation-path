import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import katex from "katex";
import { workspace, render } from "./site-support.mjs";
import { isContiguousCodeExcerpt, markedCodeExcerpt } from "../scripts/code-snippets.mjs";
const source = path.join(workspace, "examples/project-49-stable-fluids"),
  content = path.join(workspace, "content/stable-fluids");
test("P49 authored: full C++ uses explanatory comments, four spaces and readable blocks", async () => {
  async function walk(dir) {
    const out = [];
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name);
      if (item.isDirectory()) out.push(...(await walk(file)));
      else if (/\.(cpp|hpp)$/.test(item.name)) out.push(file);
    }
    return out;
  }
  for (const file of [
    ...(await walk(path.join(source, "final"))),
    ...(await walk(path.join(source, "tests"))),
  ]) {
    const cpp = await readFile(file, "utf8");
    assert.match(cpp, /^\s*\/\/ /m, file);
    assert.ok((cpp.match(/\r?\n\s*\r?\n/g) ?? []).length >= 2, file);
    assert.doesNotMatch(cpp, /\t|\?[^\r\n:]+:/);
    for (const [index, line] of cpp.split(/\r?\n/).entries())
      assert.equal((line.match(/^ +(?=\S)/)?.[0].length ?? 0) % 4, 0, `${file}:${index + 1}`);
  }
});
test("P49 authored: fifteen connected lessons, exact marker bindings and valid formulas", async () => {
  const lessons = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  assert.equal(lessons.length, 15);
  for (const [index, file] of lessons.entries()) {
    assert.equal(Number(file.slice(0, 2)), index + 1);
    const mdx = await readFile(path.join(content, file), "utf8");
    assert.ok(Buffer.byteLength(mdx) <= 32 * 1024, file);
    assert.match(mdx, new RegExp(`mode="fluid-${index + 1}"`));
    for (const title of [
      "Vấn đề cần giải quyết",
      "Hiểu ý tưởng trước khi viết code",
      "Viết code từng bước",
      "Ghép các phần lại",
      "Thử làm sai để hiểu đúng",
      "Tự kiểm tra kết quả",
      "Bài tập mở rộng",
    ])
      assert.ok(mdx.includes("## " + title), `${file}: ${title}`);
    const blocks = [
      ...mdx.matchAll(
        /\{\/\* snippet ([^#]+)#([\w-]+) \*\/\}\s*```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
      ),
    ];
    assert.ok(blocks.length > 0, file);
    assert.equal([...mdx.matchAll(/```cpp /g)].length, blocks.length);
    for (const [, relative, id, title, body] of blocks) {
      assert.equal(title.split(" — ")[0], relative);
      const root = relative.startsWith("tests/")
        ? source
        : path.join(source, "checkpoints", String(index + 1).padStart(2, "0"));
      const cpp = await readFile(path.join(root, relative), "utf8");
      assert.equal(body.trim(), markedCodeExcerpt(cpp, id).trim());
      assert.ok(isContiguousCodeExcerpt(body, cpp));
    }
    for (const [, formula] of mdx.matchAll(/\$\$([\s\S]*?)\$\$/g))
      katex.renderToString(formula, { throwOnError: true, strict: "error" });
    assert.doesNotMatch(mdx, /\/\/ source\s*\n|đang xây|TODO|TBD/i);
  }
});
test("P49 authored: checkpoints introduce actual solver code progressively", async () => {
  const features = [
    [2, "brush.hpp", "inline void paintDisk("],
    [3, "transport.hpp", "inline void backtrace(", "inline Vec2 backtrace("],
    [4, "field.hpp", "inline double divergence("],
    [5, "poisson.hpp", "inline void jacobiIteration("],
    [6, "project.hpp", "inline Projection project("],
    [7, "transport.hpp", "inline void advectVelocity("],
    [8, "sources.hpp", "inline void emitSmoke("],
    [9, "viscosity.hpp", "inline void diffuseVelocity("],
    [10, "solver.hpp", "inline StepPlan planSteps("],
    [11, "cg.hpp", "inline void solveCG("],
    [12, "detail.hpp", "inline void advectDetailed("],
    [13, "vorticity.hpp", "inline void confineVorticity("],
    [14, "multigrid.hpp", "inline void vCycle("],
    [15, "reference.hpp", "inline ReferenceReport validate("],
  ];
  for (const [stage, file, symbol, alternate] of features) {
    const current = await readFile(
        path.join(source, "checkpoints", String(stage).padStart(2, "0"), "include/fluid", file),
        "utf8",
      ),
      previous = await readFile(
        path.join(source, "checkpoints", String(stage - 1).padStart(2, "0"), "include/fluid", file),
        "utf8",
      );
    const name = alternate ?? symbol;
    assert.ok(current.includes(name), `${stage} adds ${name}`);
    assert.ok(!previous.includes(name), `${stage - 1} excludes ${name}`);
  }
  const starter = await readFile(path.join(source, "starter/include/fluid/scenes.hpp"), "utf8");
  assert.ok(!starter.includes("std::exp("));
});
test("P49 authored: required oracles, scale and graphics limitations are explicit", async () => {
  const all = (
    await Promise.all((await readdir(content)).map((f) => readFile(path.join(content, f), "utf8")))
  ).join("\n");
  for (const value of [
    "0.1875",
    "0.19921875",
    "256",
    "128",
    "MacCormack",
    "confinement",
    "mean",
    "h⁴",
    "R=0.5",
    "dt*residual",
    "không bảo toàn",
    "không phải",
    "ctest --test-dir build -C Debug",
    "ctest --test-dir build -C Release",
  ])
    assert.ok(all.includes(value), value);
  const tests = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  for (const oracle of [
    "independent Poisson residual oracle",
    "shared C++ and Canvas projection fixture",
    "implicit viscosity equation oracle",
    "analytic Neumann RHS",
    "MacCormack limiter extrema",
    "fixed timestep schedules",
  ])
    assert.ok(tests.includes(oracle));
  assert.doesNotMatch(tests, /#include\s*<cassert>|\bassert\s*\(/);
});
test("P49 routes: overview and all fifteen production lessons expose runnable code", async () => {
  const overview = await render("/projects/stable-fluids");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  for (const file of (await readdir(content)).sort()) {
    const route = "/projects/stable-fluids/" + file.slice(0, -4),
      response = await render(route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert.ok(Buffer.byteLength(html) < 350 * 1024, route);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
  }
});
