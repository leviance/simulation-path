import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-12-rotating-triangle");
const lessons = [
  "01-noi-ba-diem-thanh-tam-giac-3d",
  "02-pivot-va-local-space",
  "03-rotation-quanh-truc-x",
  "04-pitch-yaw-roll-va-thu-tu",
  "05-normal-quay-cung-tam-giac",
  "06-keo-chuot-va-roll",
  "07-chuyen-dong-va-che-do-demo",
  "08-hoan-thien-va-kiem-chung",
];
test("Project 12 rebuild has eight teachable checkpoints with literal four-space source excerpts", async () => {
  const files = (await readdir(path.join(workspace, "content/rotating-triangle")))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    lessons.map((slug) => slug + ".mdx"),
  );
  for (const [i, file] of files.entries()) {
    const mdx = await readFile(path.join(workspace, "content/rotating-triangle", file), "utf8");
    let count = 0;
    for (const [, title, snippet] of mdx.matchAll(
      /\x60\x60\x60cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g,
    )) {
      const relative = title.split(" — ")[0];
      const source = await readFile(
        relative.startsWith("tests/")
          ? path.join(root, relative)
          : path.join(root, "checkpoints", String(i + 1).padStart(2, "0"), relative),
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

test("Project 12 rebuild compiles every MDX lesson with real math, One Dark and Canvas plugins", async () => {
  for (const slug of lessons) {
    const source = await readFile(
      path.join(workspace, "content/rotating-triangle", slug + ".mdx"),
      "utf8",
    );
    const compiled = String(await compile(source, courseMdxOptions));
    assert.match(
      source,
      /^import \{ InteractiveLab \} from "@\/components\/labs\/interactive-lab";/m,
    );
    assert.doesNotMatch(compiled, /_missingMdxReference\("InteractiveLab"/);
    assert.match(compiled, /one-dark-pro/);
    assert.match(compiled, /InteractiveLab/);
    assert.match(compiled, /ma-chay-duoc-sau-bai|tự-kiểm-tra-kết-quả/);
  }
});

test("Project 12 rebuild uses direct rotations, geometry normal, clipped edges and owned logical drag", async () => {
  const source = async (file) => readFile(path.join(root, file), "utf8");
  const math = await source("final/include/lab.hpp"),
    view = await source("final/include/view.hpp"),
    main = await source("final/src/main.cpp");
  for (const fn of [
    "rotateX",
    "rotateY",
    "rotateZ",
    "rotateEuler",
    "triangleRawNormal",
    "triangleUnitNormal",
    "inverseRotateEuler",
    "normalRotationError",
  ])
    assert.ok(math.includes(fn), fn);
  assert.doesNotMatch(math, /\b(?:Mat4|glm|quaternion)\s*[<(]/);
  assert.match(view, /triangleUnitNormal\(world\)/);
  assert.match(view, /arrow3D\(image, center, endpoint, scene\)/);
  assert.match(view, /clipDepth\(start, end, scene.lens\)/);
  assert.doesNotMatch(view, /if \(projection.allVisible\)/);
  for (const text of [
    "SDL_ConvertEventToRenderCoordinates",
    "event.motion.which == owner",
    "updateDrag({event.button.x, event.button.y})",
    "SDL_LOGICAL_PRESENTATION_LETTERBOX",
  ])
    assert.ok(main.includes(text), text);
  assert.match(main, /SDLK_Q/);
  assert.match(main, /SDLK_E/);
  assert.match(await source("final/include/presentation.hpp"), /if \(!scene.debug\)/);
  assert.doesNotMatch(await source("checkpoints/02/include/lab.hpp"), /inline Vec3 rotateX/);
  assert.match(await source("checkpoints/03/include/lab.hpp"), /inline Vec3 rotateX/);
  assert.doesNotMatch(await source("checkpoints/03/include/lab.hpp"), /inline Vec3 rotateY/);
  assert.doesNotMatch(await source("checkpoints/04/include/view.hpp"), /arrow3D/);
  assert.match(await source("checkpoints/05/include/view.hpp"), /arrow3D/);
  assert.doesNotMatch(await source("checkpoints/05/src/main.cpp"), /SDL_CaptureMouse/);
  assert.match(await source("checkpoints/06/src/main.cpp"), /SDL_CaptureMouse/);
  assert.doesNotMatch(await source("checkpoints/07/include/lab.hpp"), /inverseRotateEuler/);
  const tests = await source("tests/tests.cpp");
  assert.match(tests, /2.0, -3.0, -1.0/);
  assert.match(tests, /-1.71, 0.51, 6.45/);
  assert.doesNotMatch(tests, /\bassert\s*\(/);
});

test("Project 12 rebuild renders all eight routes and complete runnable source", async () => {
  for (const slug of lessons) {
    const response = await render("/projects/rotating-triangle/" + slug);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /data-theme="one-dark-pro"/);
    assert.doesNotMatch(html, /Checkpoint đang xây/);
  }
  const html = await (await render("/projects/rotating-triangle/" + lessons.at(-1))).text();
  assert.match(html, /Toàn bộ mã nguồn của dự án/);
  for (const file of [
    "include/lab.hpp",
    "include/projection.hpp",
    "include/scene.hpp",
    "include/view.hpp",
    "include/presentation.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(file), file);
  for (const label of [
    "unit normal",
    "edge-length error",
    "round-trip error",
    "normal rotation error",
    "Ẩn debug",
  ])
    assert.ok(html.includes(label), label);
  assert.match(html, /projects\/wireframe-cube/);
});
