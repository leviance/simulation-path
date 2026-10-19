import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-08-mouse-turret");
const lessons = [
  ["01-bo-khung-thap-phao-va-muc-tieu", "world-space", "World space"],
  ["02-dot-product-do-muc-do-cung-huong", "dot-product", "Dot product"],
  ["03-tu-dot-product-den-goc", "angle-between", "Angle between"],
  ["04-projection-va-do-lech", "vector-projection", "Vector projection"],
  ["05-quay-ve-phia-muc-tieu", "cross-product-2d", "2D cross product"],
  ["06-vung-nhin-va-bien", "view-cone", "View cone"],
  ["07-hoan-thien-va-kiem-chung", "round-trip-test", "Round-trip test"],
];

test("Project 08 rebuild teaches seven runnable checkpoints through contiguous four-space source excerpts", async () => {
  const files = (await readdir(path.join(workspace, "content/mouse-turret")))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    lessons.map(([slug]) => slug + ".mdx"),
  );
  for (const [index, file] of files.entries()) {
    const mdx = await readFile(path.join(workspace, "content/mouse-turret", file), "utf8");
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
      assert.ok(start >= 0);
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
    assert.ok(count >= 3, file);
  }
});

test("Project 08 rebuild adds scene, dot, angle, projection, rate steering, cone and audit without snap shortcuts", async () => {
  const read = (file) => readFile(path.join(root, file), "utf8");
  assert.doesNotMatch(await read("starter/include/scene.hpp"), /targetOffset/);
  assert.match(await read("starter/include/view.hpp"), /inline void arrow/);
  assert.doesNotMatch(await read("checkpoints/01/include/lab.hpp"), /inline double dot/);
  assert.doesNotMatch(await read("checkpoints/02/include/lab.hpp"), /inline double angleBetween/);
  assert.doesNotMatch(await read("checkpoints/03/include/view.hpp"), /inline void drawProjection/);
  assert.doesNotMatch(await read("checkpoints/04/include/lab.hpp"), /inline double rotateTowards/);
  assert.doesNotMatch(await read("checkpoints/05/include/view.hpp"), /inline void drawCone/);
  assert.doesNotMatch(
    await read("checkpoints/06/include/presentation.hpp"),
    /reconstruction error/,
  );
  assert.match(await read("checkpoints/07/include/presentation.hpp"), /reconstruction error/);
  const main = await read("final/src/main.cpp");
  for (const expression of [
    /SDL_WINDOW_HIGH_PIXEL_DENSITY/,
    /SDL_LOGICAL_PRESENTATION_LETTERBOX/,
    /SDL_ConvertEventToRenderCoordinates/,
    /event.motion.which == owner/,
    /scene.followMouse && event.motion.state == 0/,
    /SDL_BUTTON_LMASK/,
    /smokeFrames >= 12/,
  ])
    assert.match(main, expression);
  assert.doesNotMatch(main, /SDL_Render(?:Line|Point|FillRect|Rect)\(/);
  const view = await read("final/include/view.hpp");
  assert.match(view, /drawProjection\(image, scene.targetOffset, forward\)/);
  assert.match(view, /drawTurret\(image, forward\)/);
  assert.match(view, /const Vec2 muzzle = scale\(forward, 2.4\)/);
  assert.match(await read("tests/tests.cpp"), /steering independent angle oracle/);
  assert.match(await read("tests/tests.cpp"), /projection independent oracle/);
});

test("Project 08 rebuild renders every lesson, glossary reference and full runnable final with all core readouts", async () => {
  for (const [slug, anchor, label] of lessons) {
    const response = await render("/projects/mouse-turret/" + slug);
    assert.equal(response.status, 200, slug);
    assert.match(
      await response.text(),
      new RegExp('href="/glossary#' + anchor + '"[^>]*>' + label + "</a>"),
      slug,
    );
  }
  const html = await (await render("/projects/mouse-turret/07-hoan-thien-va-kiem-chung")).text();
  assert.match(html, /Toàn bộ mã nguồn của dự án/);
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
    assert.ok(html.includes(file), file);
  for (const text of [
    "forward",
    "target direction",
    "raw dot",
    "normalized dot",
    "unsigned angle",
    "projection",
    "rejection",
    "signed error",
    "reconstruction error",
  ])
    assert.ok(html.includes(text), text);
  assert.match(html, /Theo chuột/);
  assert.match(html, /Nửa góc vùng nhìn/);
  assert.match(html, /Project 09/);
});
