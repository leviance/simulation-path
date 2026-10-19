import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";

const root = path.join(workspace, "examples/project-13-wireframe-cube");
const lessons = [
  "01-tam-dinh-va-quy-uoc-index",
  "02-muoi-hai-canh-tu-edge-list",
  "03-xoay-ca-khoi-lap-phuong",
  "04-perspective-va-orthographic",
  "05-di-chuyen-keo-chuot-va-zoom",
  "06-depth-cue-va-che-do-demo",
  "07-hoan-thien-va-kiem-chung",
];
test("Project 13 rebuild has seven teachable checkpoints with literal four-space source excerpts", async () => {
  const files = (await readdir(path.join(workspace, "content/wireframe-cube")))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    lessons.map((slug) => slug + ".mdx"),
  );
  for (const [i, file] of files.entries()) {
    const mdx = await readFile(path.join(workspace, "content/wireframe-cube", file), "utf8");
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

test("Project 13 rebuild compiles every MDX lesson with real math, One Dark and Canvas plugins", async () => {
  for (const slug of lessons) {
    const source = await readFile(
      path.join(workspace, "content/wireframe-cube", slug + ".mdx"),
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

test("Project 13 rebuild keeps the required product across native milestones", async () => {
  const source = (file) => readFile(path.join(root, file), "utf8");
  const lab = await source("final/include/lab.hpp"),
    scene = await source("final/include/scene.hpp"),
    pipeline = await source("final/include/pipeline.hpp"),
    view = await source("final/include/view.hpp"),
    main = await source("final/src/main.cpp"),
    presentation = await source("final/include/presentation.hpp");
  assert.match(lab, /std::array<Edge, 12> kCubeEdges/);
  for (const symbol of [
    "projectOrthographic",
    "zoomScene",
    "moveModel",
    "applyMouseDrag",
    "advanceScene",
  ])
    assert.ok(scene.includes(symbol), symbol);
  assert.match(scene, /return \{0.0, 0.0, 1100.0, 800.0\}/);
  assert.match(pipeline, /clipDepth\(start, end, scene.lens\)/);
  assert.match(pipeline, /clipScreen\(\*from, \*to, viewportFor\(\)\)/);
  assert.match(pipeline, /extraProjections \+= 2/);
  assert.match(pipeline, /std::stable_sort/);
  assert.match(view, /stats.vertexProjections = projected.projectionCount/);
  assert.doesNotMatch(presentation, /projectCube\(/);
  for (const text of [
    "SDL_GetKeyboardState",
    "SDL_MOUSEWHEEL_FLIPPED",
    "SDL_ConvertEventToRenderCoordinates",
    "event.motion.which == owner",
    "updateDrag({event.button.x, event.button.y})",
    "SDL_LOGICAL_PRESENTATION_LETTERBOX",
  ])
    assert.ok(main.includes(text), text);
  assert.doesNotMatch(main + view + presentation, /SDL_Render(?:Line|Lines|Geometry)\(/);
  assert.doesNotMatch(await source("checkpoints/01/include/lab.hpp"), /struct Edge/);
  assert.match(await source("checkpoints/02/include/lab.hpp"), /struct Edge/);
  assert.doesNotMatch(
    await source("checkpoints/02/include/lab.hpp"),
    /inline CubeVertices rotateCube/,
  );
  assert.match(await source("checkpoints/03/include/lab.hpp"), /inline CubeVertices rotateCube/);
  assert.doesNotMatch(
    await source("checkpoints/03/include/scene.hpp"),
    /inline ProjectionResult projectOrthographic/,
  );
  assert.match(
    await source("checkpoints/04/include/scene.hpp"),
    /inline ProjectionResult projectOrthographic/,
  );
  assert.doesNotMatch(await source("checkpoints/04/src/main.cpp"), /SDL_CaptureMouse/);
  assert.match(await source("checkpoints/05/src/main.cpp"), /SDL_CaptureMouse/);
  assert.doesNotMatch(await source("checkpoints/05/include/pipeline.hpp"), /stable_sort/);
  assert.match(await source("checkpoints/06/include/pipeline.hpp"), /stable_sort/);
  assert.doesNotMatch(
    await source("checkpoints/06/include/lab.hpp"),
    /inline bool hasValidCubeTopology/,
  );
  const tests = await source("tests/tests.cpp");
  assert.match(tests, /650.0/);
  assert.match(tests, /616.6666666666666/);
  assert.match(tests, /clean mode retains cube pixels/);
  assert.doesNotMatch(tests, /\bassert\s*\(/);
});
test("Project 13 rebuild renders seven routes, full source and the required Canvas controls", async () => {
  for (const slug of lessons) {
    const response = await render("/projects/wireframe-cube/" + slug);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /data-theme="one-dark-pro"/);
    assert.doesNotMatch(html, /Checkpoint đang xây/);
  }
  const html = await (await render("/projects/wireframe-cube/" + lessons.at(-1))).text();
  assert.match(html, /Toàn bộ mã nguồn của dự án/);
  for (const file of [
    "include/lab.hpp",
    "include/rotation.hpp",
    "include/projection.hpp",
    "include/scene.hpp",
    "include/pipeline.hpp",
    "include/view.hpp",
    "include/presentation.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(file), file);
  for (const text of [
    "Phép chiếu",
    "Phóng to",
    "Thu nhỏ",
    "Ẩn debug",
    "max edge error",
    "round-trip error",
    "extra clip projections",
  ])
    assert.ok(html.includes(text), text);
  assert.match(html, /projects\/fps-camera-room/);
});
