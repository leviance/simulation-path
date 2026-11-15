import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import katex from "katex";
import { workspace, render } from "./site-support.mjs";
import { markedCodeExcerpt, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
const source = path.join(workspace, "examples/project-50-sph-water"),
  content = path.join(workspace, "content/sph-water");
test("P50 authored: twelve connected lessons, formulas and exact snapshot markers", async () => {
  const files = (await readdir(content)).filter((f) => f.endsWith(".mdx")).sort();
  assert.equal(files.length, 12);
  for (const [index, file] of files.entries()) {
    assert.equal(Number(file.slice(0, 2)), index + 1);
    const mdx = await readFile(path.join(content, file), "utf8");
    assert.match(mdx, new RegExp(`mode="sph-${index + 1}"`));
    for (const heading of [
      "Vấn đề cần giải quyết",
      "Hiểu ý tưởng trước khi viết code",
      "Viết code từng bước",
      "Ghép các phần lại",
      "Thử làm sai để hiểu đúng",
      "Tự kiểm tra kết quả",
      "Bài tập mở rộng",
    ])
      assert.ok(mdx.includes("## " + heading), file + ": " + heading);
    const blocks = [
      ...mdx.matchAll(
        /\{\/\* snippet ([^#]+)#([\w-]+) \*\/\}\s*```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
      ),
    ];
    assert.ok(blocks.length > 0);
    assert.equal(blocks.length, [...mdx.matchAll(/```cpp /g)].length);
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
    assert.doesNotMatch(mdx, /Đồng bộ từ marker|TODO|TBD|đang xây/);
  }
});
test("P50 authored: progressive responsibilities are real code, not only UI labels", async () => {
  const features = [
    [3, "kernel.hpp", "inline double kernel("],
    [4, "forces.hpp", "inline void computeDensity("],
    [5, "forces.hpp", "inline double pressure("],
    [6, "kernel.hpp", "inline double artificialViscosity("],
    [7, "neighbors.hpp", "struct Grid {"],
    [8, "solver.hpp", "inline double chooseDt("],
    [9, "surface.hpp", "inline void reconstruct("],
    [10, "emitter.hpp", "inline std::size_t emitBurst("],
    [11, "boundary.hpp", "inline void movePaddle("],
    [12, "reference.hpp", "inline Reference reference("],
  ];
  for (const [stage, file, symbol] of features) {
    const read = (step) =>
      readFile(
        path.join(source, "checkpoints", String(step).padStart(2, "0"), "include/sph", file),
        "utf8",
      );
    assert.ok((await read(stage)).includes(symbol));
    assert.ok(!(await read(stage - 1)).includes(symbol));
  }
  const app = await readFile(path.join(source, "final/include/app/state.hpp"), "utf8");
  assert.match(app, /requested = 5000/);
  assert.match(app, /steps < 24/);
});
test("P50 authored: 2D units, actual scale, model limits and bounded verification stay explicit", async () => {
  const text = (
    await Promise.all(
      (await readdir(content))
        .filter((f) => f.endsWith(".mdx"))
        .map((f) => readFile(path.join(content, f), "utf8")),
    )
  ).join("\n");
  for (const term of [
    "5.000",
    "kg/m²",
    "N/m",
    "zero-gravity",
    "không giải Poisson",
    "không phải độ nhớt thực",
    "không chứng minh cân bằng thủy tĩnh",
    "12.000",
    "24 substep",
    "dropped",
    "count",
    "mass",
  ])
    assert.ok(text.includes(term), term);
  const cpp = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  assert.match(cpp, /independent radial area integral/);
  assert.match(cpp, /nonzero pair force independent numeric oracle/);
  assert.match(cpp, /actual 5000 updated particles/);
  assert.doesNotMatch(cpp, /\bassert\s*\(/);
});
test("P50 authored: four spaces, comments, no ternary tricks or oversized files", async () => {
  async function walk(dir) {
    const out = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...(await walk(file)));
      else if (/\.(cpp|hpp)$/.test(file)) out.push(file);
    }
    return out;
  }
  for (const file of [
    ...(await walk(path.join(source, "source-template"))),
    ...(await walk(path.join(source, "tests"))),
  ]) {
    const cpp = await readFile(file, "utf8");
    assert.ok(Buffer.byteLength(cpp) < 32768);
    assert.match(cpp, /\/\/ /);
    assert.doesNotMatch(cpp, /\t|\?[^\r\n:]+:/);
    for (const line of cpp.split(/\r?\n/))
      assert.equal((line.match(/^ +(?=\S)/)?.[0].length ?? 0) % 4, 0, file);
  }
});
test("P50 routes: overview and all twelve production lessons expose complete highlighted code", async () => {
  const overview = await render("/projects/sph-water");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/i);
  for (const file of (await readdir(content)).filter((f) => f.endsWith(".mdx"))) {
    const response = await render("/projects/sph-water/" + file.replace(/\.mdx$/, ""));
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
  }
});
