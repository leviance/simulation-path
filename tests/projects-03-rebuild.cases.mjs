import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-03-mini-paint");

test("Project 03 rebuild excerpts are contiguous code from each actual checkpoint", async () => {
  let count = 0;
  const directory = path.join(workspace, "content/mini-paint");
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".mdx"))) {
    const mdx = await readFile(path.join(directory, file), "utf8");
    for (const [, title, snippet] of mdx.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      const source = await readFile(
        path.join(
          root,
          relative.startsWith("tests/")
            ? relative
            : "checkpoints/" + file.slice(0, 2) + "/" + relative,
        ),
        "utf8",
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + ": " + title);
      count++;
    }
  }
  assert.ok(count >= 35);
});

test("Project 03 rebuild progresses from pixel input through measured gaps to complete paint", async () => {
  const read = (relative) => readFile(path.join(root, relative), "utf8");
  assert.doesNotMatch(
    await read("checkpoints/01/include/paint.hpp"),
    /sampleEvery|sampleStroke|radius|forceEndpoint/,
  );
  assert.doesNotMatch(await read("checkpoints/01/include/brush.hpp"), /stampCircle/);
  assert.match(
    await read("checkpoints/02/include/brush.hpp"),
    /dx \* dx \+ dy \* dy <= radius \* radius/,
  );
  const third = await read("checkpoints/03/include/paint.hpp");
  assert.match(third, /state.maximumGap/);
  assert.match(third, /inline void drawDemo/);
  assert.doesNotMatch(third, /sampleStroke/);
  const fourth = await read("checkpoints/04/include/paint.hpp");
  assert.match(fourth, /for \(Point point : sampleStroke/);
  const final = await read("final/src/main.cpp");
  assert.match(final, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(final, /SDL_BUTTON_LMASK/);
  assert.match(final, /lab::endStroke/);
  assert.doesNotMatch(final, /SDLK_S\b|SDL_Render(?:FillRect|Line|Point)\(/);
  assert.match(final, /smokeFrames >= 12/);
  const tests = await read("tests/tests.cpp");
  assert.match(tests, /radius-two brush contains thirteen pixels/);
  assert.match(tests, /release-only segment is connected/);
  assert.match(tests, /separate strokes never bridge/);
});

test("Project 03 rebuild explains coordinate, sampling and raster limits and exports every source file", async () => {
  const first = await readFile(
    path.join(workspace, "content/mini-paint/01-mouse-input.mdx"),
    "utf8",
  );
  assert.match(first, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(first, /dirty = dirty \|\|/);
  const fourth = await readFile(
    path.join(workspace, "content/mini-paint/04-stroke-interpolation.mdx"),
    "utf8",
  );
  assert.match(fourth, /không.*khôi phục/i);
  assert.match(fourth, /4\.097/);
  const html = await (await render("/projects/mini-paint/06-validation")).text();
  for (const relative of [
    "include/framebuffer.hpp",
    "include/brush.hpp",
    "include/paint.hpp",
    "include/presentation.hpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(relative), relative);
  assert.match(html, /Toàn bộ mã nguồn của dự án/i);
  const brush = await (await render("/projects/mini-paint/02-brush-tron")).text();
  assert.match(brush, /13 pixel/);
  assert.doesNotMatch(brush, /Giữ 1 trên N mẫu/);
});
