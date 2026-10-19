import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-09-square-transformer");
const lessons = [
  "01-hinh-vuong-trong-local-space",
  "02-scale-theo-hai-truc",
  "03-xoay-bang-sin-cos",
  "04-shear-va-he-truc-bi-xien",
  "05-ma-tran-affine-3x3",
  "06-thu-tu-va-luoi",
  "07-thanh-truot-va-tuong-tac",
  "08-hoan-thien-va-kiem-chung",
];
test("Project 09 rebuild has eight teachable checkpoints with literal four-space source excerpts", async () => {
  const files = (await readdir(path.join(workspace, "content/square-transformer")))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    lessons.map((slug) => slug + ".mdx"),
  );
  for (const [i, file] of files.entries()) {
    const mdx = await readFile(path.join(workspace, "content/square-transformer", file), "utf8");
    let count = 0;
    for (const [, title, snippet] of mdx.matchAll(
      /\x60\x60\x60cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g,
    )) {
      const relative = title.split(" — ")[0];
      const source = await readFile(
        path.join(root, "checkpoints", String(i + 1).padStart(2, "0"), relative),
        "utf8",
      );
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + ": " + title);
      const actual = source.split(/\r?\n/),
        lines = snippet.split(/\r?\n/);
      const start = actual.findIndex((_, offset) =>
        lines.every((line, j) => actual[offset + j]?.trim() === line.trim()),
      );
      assert.ok(start >= 0, title);
      const original = actual.slice(start, start + lines.length),
        indent = Math.min(...original.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
      assert.equal(
        snippet,
        original.map((l) => l.slice(indent)).join("\n"),
        file + " indent drift",
      );
      count++;
    }
    assert.ok(count >= 3, file + " needs substantial source");
    assert.ok((mdx.match(/^### Bước /gm) ?? []).length >= 3, file + " needs explained steps");
    const experiment = mdx
      .split("## Thử làm sai để hiểu đúng")[1]
      .split("## Tự kiểm tra kết quả")[0];
    assert.ok(
      (experiment.match(/^\d+\. /gm) ?? []).length >= 2,
      file + " needs observable experiments",
    );
    assert.doesNotMatch(mdx, /Checkpoint đang xây|TODO|lorem ipsum/);
    for (const role of [
      "Vấn đề cần giải quyết",
      "Hiểu ý tưởng trước khi viết code",
      "Viết code từng bước",
      "Ghép các phần lại",
      "Thử làm sai để hiểu đúng",
      "Tự kiểm tra kết quả",
      "Bài tập mở rộng",
    ])
      assert.ok(mdx.includes("## " + role));
  }
});

test("Project 09 rebuild compiles every MDX lesson with real math, One Dark and Canvas plugins", async () => {
  for (const slug of lessons) {
    const source = await readFile(
      path.join(workspace, "content/square-transformer", slug + ".mdx"),
      "utf8",
    );
    const compiled = String(await compile(source, courseMdxOptions));
    assert.match(compiled, /one-dark-pro/);
    assert.match(compiled, /InteractiveLab/);
    assert.match(compiled, /ma-chay-duoc-sau-bai|tự-kiểm-tra-kết-quả/);
  }
});

test("Project 09 rebuild uses Mat2 and Mat3 in render plus actual native sliders and independent validation", async () => {
  const source = async (file) => readFile(path.join(root, file), "utf8");
  const lab = await source("final/include/lab.hpp"),
    scene = await source("final/include/scene.hpp"),
    view = await source("final/include/view.hpp");
  assert.match(lab, /struct Mat2/);
  assert.match(lab, /struct Mat3/);
  assert.match(lab, /inline Mat2 multiply/);
  assert.match(lab, /inline Mat3 multiply/);
  assert.match(scene, /transformPoint\(sceneMatrix\(scene\), local\)/);
  const cp4 = await source("checkpoints/04/include/scene.hpp");
  assert.match(cp4, /transformVector\(sceneLinearMatrix\(scene\), local\)/);
  assert.match(view, /worldPoint\(\{value, -2\.0\}, scene\)/);
  assert.match(view, /parameterValue\(scene, index\)/);
  const controls = await source("final/include/controls.hpp"),
    main = await source("final/src/main.cpp");
  assert.match(controls, /array<Slider, 7>/);
  for (const name of ["hitSlider", "setParameter", "updateSlider", "nudgeSlider"])
    assert.ok(controls.includes(name));
  for (const name of [
    "SDL_ConvertEventToRenderCoordinates",
    "SDL_LOGICAL_PRESENTATION_LETTERBOX",
    "SDL_WINDOW_HIGH_PIXEL_DENSITY",
    "SDL_CaptureMouse",
    "SDL_EVENT_WINDOW_FOCUS_LOST",
    "event.motion.which == owner",
    "updateDrag({event.button.x, event.button.y})",
  ])
    assert.ok(main.includes(name), name);
  const validation = await source("tests/tests.cpp");
  assert.match(validation, /reference\(/);
  assert.match(validation, /expectedDet/);
  assert.match(validation, /signedArea/);
  assert.doesNotMatch(validation, /\bassert\s*\(/);
  assert.match(validation, /return EXIT_FAILURE/);
  assert.match(await source("checkpoints/08/include/presentation.hpp"), /area ratio/);
  assert.doesNotMatch(await source("checkpoints/07/include/presentation.hpp"), /area ratio/);
});

test("Project 09 rebuild renders all eight routes and final complete source", async () => {
  for (const slug of lessons) {
    const response = await render("/projects/square-transformer/" + slug);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /data-theme="one-dark-pro"/);
    assert.doesNotMatch(html, /Checkpoint đang xây/);
  }
  const html = await (await render("/projects/square-transformer/" + lessons.at(-1))).text();
  assert.match(html, /Toàn bộ mã nguồn của dự án/);
  for (const file of [
    "include/lab.hpp",
    "include/scene.hpp",
    "include/controls.hpp",
    "include/view.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(file));
  assert.match(html, /determinant/);
  assert.match(html, /area ratio/);
  assert.match(html, /projects\/3d-compass/);
});
