import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-07-unit-circle");
const lessons = [
  ["01-radian-va-vong-tron-don-vi", "radian", "Radian"],
  ["02-sin-cos-thanh-toa-do", "unit-circle", "Unit circle"],
  ["03-van-toc-goc-va-delta-time", "angular-velocity", "Angular velocity"],
  ["04-hinh-chieu-len-hai-truc", "world-space", "World space"],
  ["05-do-thi-sin-cos", "delta-time", "Delta time"],
  ["06-keo-kim-voi-atan2", "atan2", "atan2"],
  ["07-hoan-thien-va-kiem-chung", "round-trip-test", "Round-trip test"],
];

test("Project 07 rebuild teaches seven runnable checkpoints with contiguous four-space source excerpts", async () => {
  const files = (await readdir(path.join(workspace, "content/unit-circle")))
    .filter((file) => file.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    lessons.map(([slug]) => slug + ".mdx"),
  );
  for (const [index, file] of files.entries()) {
    const mdx = await readFile(path.join(workspace, "content/unit-circle", file), "utf8");
    let count = 0;
    for (const [, title, snippet] of mdx.matchAll(
      /\x60\x60\x60cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g,
    )) {
      const relative = title.split(" — ")[0];
      const sourcePath = relative.startsWith("tests/")
        ? relative
        : "checkpoints/" + String(index + 1).padStart(2, "0") + "/" + relative;
      const source = await readFile(path.join(root, sourcePath), "utf8");
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + ": " + title);
      const actual = source.split(/\r?\n/),
        lines = snippet.split(/\r?\n/);
      const start = actual.findIndex((_, offset) =>
        lines.every((line, j) => actual[offset + j]?.trim() === line.trim()),
      );
      assert.ok(start >= 0, title);
      const original = actual.slice(start, start + lines.length);
      const indent = Math.min(
        ...original.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length),
      );
      assert.equal(
        snippet,
        original.map((line) => line.slice(indent)).join("\n"),
        file + " indentation drift",
      );
      count++;
    }
    assert.ok(count >= 3, file + " must teach at least three concrete code changes");
  }
});

test("Project 07 rebuild separates unit math, motion, projections, timestamp sampling and owned input", async () => {
  const read = (file) => readFile(path.join(root, file), "utf8");
  assert.doesNotMatch(await read("starter/include/scene.hpp"), /double angle/);
  assert.doesNotMatch(await read("checkpoints/01/include/lab.hpp"), /inline Vec2 unitDirection/);
  assert.doesNotMatch(await read("checkpoints/02/include/lab.hpp"), /inline double advanceAngle/);
  assert.doesNotMatch(await read("checkpoints/03/include/view.hpp"), /inline void drawProjections/);
  assert.doesNotMatch(await read("checkpoints/04/include/scene.hpp"), /nextSampleIndex/);
  assert.doesNotMatch(await read("checkpoints/05/include/scene.hpp"), /inline bool beginDrag/);
  assert.match(await read("checkpoints/06/include/scene.hpp"), /angularGrabOffset/);
  const scene = await read("final/include/scene.hpp");
  assert.match(scene, /static_cast<double>\(scene.nextSampleIndex\) \* kSampleInterval/);
  assert.match(scene, /advanceAngle\(scene.angle, scene.angularSpeed, offset\)/);
  assert.match(await read("final/include/lab.hpp"), /kMaximumSamples = 361/);
  assert.match(await read("final/include/view.hpp"), /drawProjections\(image, direction\)/);
  assert.match(await read("final/include/view.hpp"), /drawWaveGraph\(image, scene\)/);
  const main = await read("final/src/main.cpp");
  for (const expression of [
    /SDL_WINDOW_HIGH_PIXEL_DENSITY/,
    /SDL_LOGICAL_PRESENTATION_LETTERBOX/,
    /SDL_ConvertEventToRenderCoordinates/,
    /event.motion.which == owner/,
    /SDL_BUTTON_LMASK/,
    /smokeFrames >= 12/,
  ])
    assert.match(main, expression);
  assert.doesNotMatch(main, /SDL_Render(?:Line|Point|FillRect|Rect)\(/);
  const tests = await read("tests/tests.cpp");
  assert.match(tests, /std::sin\(angle\)/);
  assert.match(tests, /no future samples/);
  assert.match(tests, /visible real cosine graph/);
  assert.doesNotMatch(tests, /\bassert\(/);
});

test("Project 07 rebuild renders every lesson with references, the full final source and simultaneous graph controls", async () => {
  for (const [slug, anchor, label] of lessons) {
    const response = await render("/projects/unit-circle/" + slug);
    assert.equal(response.status, 200, slug);
    assert.match(
      await response.text(),
      new RegExp('href="/glossary#' + anchor + '"[^>]*>' + label + "</a>"),
      slug,
    );
  }
  const final = await (await render("/projects/unit-circle/07-hoan-thien-va-kiem-chung")).text();
  assert.match(final, /Toàn bộ mã nguồn của dự án/);
  for (const file of [
    "include/lab.hpp",
    "include/scene.hpp",
    "include/framebuffer.hpp",
    "include/view.hpp",
    "include/presentation.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
    "CMakeLists.txt",
  ])
    assert.ok(final.includes(file), file);
  assert.match(final, /Vận tốc góc/);
  assert.match(final, /cos² \+ sin²/);
  assert.match(final, /361 mẫu/);
  assert.match(final, /Project 08/);
});
