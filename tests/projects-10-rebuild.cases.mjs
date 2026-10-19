import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-10-3d-compass");
const lessons = [
  "01-vec3-va-la-ban-ba-truc",
  "02-tam-giac-va-hai-vector-canh",
  "03-cross-product-va-raw-normal",
  "04-unit-normal-va-dien-tich",
  "05-winding-va-quy-tac-ban-tay-phai",
  "06-camera-perspective-va-input",
  "07-suy-bien-va-kiem-chung",
];
test("Project 10 rebuild has seven teachable checkpoints with literal four-space source excerpts", async () => {
  const files = (await readdir(path.join(workspace, "content/3d-compass")))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    lessons.map((slug) => slug + ".mdx"),
  );
  for (const [i, file] of files.entries()) {
    const mdx = await readFile(path.join(workspace, "content/3d-compass", file), "utf8");
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

test("Project 10 rebuild compiles every MDX lesson with real math, One Dark and Canvas plugins", async () => {
  for (const slug of lessons) {
    const source = await readFile(
      path.join(workspace, "content/3d-compass", slug + ".mdx"),
      "utf8",
    );
    const compiled = String(await compile(source, courseMdxOptions));
    assert.match(compiled, /one-dark-pro/);
    assert.match(compiled, /InteractiveLab/);
    assert.match(compiled, /ma-chay-duoc-sau-bai|tự-kiểm-tra-kết-quả/);
  }
});

test("Project 10 rebuild uses real perspective, 3D arrows, geometry-derived normals and owned orbit", async () => {
  const source = async (file) => readFile(path.join(root, file), "utf8");
  const math = await source("final/include/lab.hpp"),
    camera = await source("final/include/camera.hpp"),
    view = await source("final/include/view.hpp"),
    main = await source("final/src/main.cpp");
  assert.doesNotMatch(math + camera + view, /projectIsometric|axonometric/);
  for (const name of ["cross", "normalHasDirection", "triangleUnitNormal", "orthogonalityError"])
    assert.ok(math.includes(name));
  assert.match(camera, /420\.0 \* cameraPoint\.x \/ cameraPoint\.z/);
  assert.match(camera, /hit.z = plane.first/);
  assert.match(view, /inline void arrow3D/);
  assert.match(view, /clipDepth\(start, end\)/);
  assert.match(view, /triangleRawNormal\(triangle\)/);
  const hud = await source("final/include/presentation.hpp");
  assert.match(hud, /subtract\(cameraEye\(scene.camera\), triangleCentroid\(triangle\)\)/);
  assert.match(hud, /unit N undefined/);
  for (const name of [
    "SDL_ConvertEventToRenderCoordinates",
    "SDL_LOGICAL_PRESENTATION_LETTERBOX",
    "SDL_WINDOW_HIGH_PIXEL_DENSITY",
    "event.motion.which == owner",
    "updateOrbit({event.button.x, event.button.y})",
  ])
    assert.ok(main.includes(name), name);
  const cp1 = await source("checkpoints/01/include/view.hpp"),
    cp2 = await source("checkpoints/02/include/view.hpp"),
    cp3 = await source("checkpoints/03/include/view.hpp");
  assert.match(cp1, /drawAxes/);
  assert.doesNotMatch(cp1, /triangleRawNormal/);
  assert.match(cp2, /triangleEdges/);
  assert.doesNotMatch(cp2, /triangleRawNormal/);
  assert.match(cp3, /triangleRawNormal/);
  assert.doesNotMatch(cp3, /triangleUnitNormal/);
  assert.doesNotMatch(await source("checkpoints/05/src/main.cpp"), /SDL_CaptureMouse/);
  assert.match(await source("checkpoints/06/src/main.cpp"), /SDL_CaptureMouse/);
  assert.doesNotMatch(await source("checkpoints/06/include/lab.hpp"), /orthogonalityError/);
  const tests = await source("tests/tests.cpp");
  assert.match(tests, /double heron/);
  assert.match(tests, /cross\(\{1.0, 2.0, 3.0\}/);
  assert.doesNotMatch(tests, /\bassert\s*\(/);
  assert.match(tests, /EXIT_FAILURE/);
});

test("Project 10 rebuild renders all seven routes and complete runnable perspective source", async () => {
  for (const slug of lessons) {
    const response = await render("/projects/3d-compass/" + slug);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /data-theme="one-dark-pro"/);
    assert.doesNotMatch(html, /Checkpoint đang xây/);
  }
  const html = await (await render("/projects/3d-compass/" + lessons.at(-1))).text();
  assert.match(html, /Toàn bộ mã nguồn của dự án/);
  for (const file of [
    "include/lab.hpp",
    "include/camera.hpp",
    "include/view.hpp",
    "include/scene.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(file));
  for (const label of [
    "raw cross",
    "unit normal",
    "facing",
    "normal status",
    "orthogonality error",
  ])
    assert.ok(html.includes(label));
  assert.match(html, /projects\/perspective-point/);
});
