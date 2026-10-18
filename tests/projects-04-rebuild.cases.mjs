import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-04-tiny-2d-rasterizer");

test("Project 04 rebuild excerpts match contiguous source from their exact checkpoint", async () => {
  let count = 0;
  const directory = path.join(workspace, "content/tiny-2d-rasterizer");
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".mdx"))) {
    const source = await readFile(path.join(directory, file), "utf8");
    for (const [, title, snippet] of source.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      const actual = await readFile(
        path.join(
          root,
          relative.startsWith("tests/")
            ? relative
            : "checkpoints/" + file.slice(0, 2) + "/" + relative,
        ),
        "utf8",
      );
      assert.ok(isContiguousCodeExcerpt(snippet, actual), file + ": " + title);
      count++;
    }
  }
  assert.ok(count >= 35);
});

test("Project 04 rebuild adds input, every required fill and a bounded honest benchmark progressively", async () => {
  const read = (relative) => readFile(path.join(root, relative), "utf8");
  const one = await read("checkpoints/01/include/lab.hpp");
  assert.match(one, /inline std::vector<LineStep> dda/);
  assert.doesNotMatch(one, /bresenham|filledCircle|rectangle/);
  assert.doesNotMatch(
    await read("checkpoints/02/src/main.cpp"),
    /SDL_ConvertEventToRenderCoordinates/,
  );
  assert.match(
    await read("checkpoints/03/include/view.hpp"),
    /std::array<std::uint32_t, kCells \* kCells> source/,
  );
  assert.match(await read("checkpoints/04/include/drawing.hpp"), /inline void fillRect/);
  const five = await read("checkpoints/05/include/lab.hpp");
  assert.match(five, /inline std::vector<Point> filledCircle/);
  assert.match(five, /if \(decision < 0\)/);
  const main = await read("final/src/main.cpp");
  assert.match(main, /SDL_WINDOW_RESIZABLE \| SDL_WINDOW_HIGH_PIXEL_DENSITY/);
  assert.match(main, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(main, /SDL_BUTTON_LMASK/);
  assert.match(main, /lab::endDrag/);
  assert.match(main, /smokeFrames >= 12/);
  assert.doesNotMatch(main, /SDL_Render(?:Line|Point|FillRect|Rect)\(/);
  const benchmark = await read("final/include/benchmark.hpp");
  assert.match(benchmark, /20'000/);
  assert.match(benchmark, /rounds = 7/);
  assert.match(benchmark, /checksum \^= static_cast<std::uint32_t>\(step.point.x\)/);
  assert.match(benchmark, /checksum \^= static_cast<std::uint32_t>\(step.point.y\)/);
  assert.match(benchmark, /cursor \+ 128/);
  assert.match(benchmark, /seconds\(30\)/);
  assert.match(benchmark, /if \(!benchmark.complete\)/);
  const tests = await read("tests/tests.cpp");
  assert.match(tests, /y = -24; y <= 24/);
  assert.match(tests, /width <= 32/);
  assert.match(tests, /radius <= 128/);
  assert.match(tests, /expired benchmark never reports completion/);
});

test("Project 04 rebuild teaches midpoint fill as required work and exports all runnable source", async () => {
  const circle = await readFile(
    path.join(workspace, "content/tiny-2d-rasterizer/05-midpoint-circle.mdx"),
    "utf8",
  );
  assert.match(circle, /21 pixel/);
  assert.match(circle, /13 pixel/);
  assert.match(circle, /decision < 0/);
  assert.match(circle, /inline std::vector<Point> filledCircle/);
  const html = await (await render("/projects/tiny-2d-rasterizer/06-benchmark-validation")).text();
  assert.match(html, /Toàn bộ mã nguồn của dự án/i);
  for (const file of [
    "include/lab.hpp",
    "include/drawing.hpp",
    "include/framebuffer.hpp",
    "include/scene.hpp",
    "include/view.hpp",
    "include/benchmark.hpp",
    "include/presentation.hpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(file), file);
  const lab = await (await render("/projects/tiny-2d-rasterizer/05-midpoint-circle")).text();
  assert.match(lab, /Tô tới viền midpoint/);
  assert.match(lab, /21 pixel/);
});
