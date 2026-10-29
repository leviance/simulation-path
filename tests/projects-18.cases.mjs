import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";
import { assertPublishedProjectSources } from "./published-source-support.mjs";

const root = path.join(workspace, "examples/project-18-near-plane-clipper");
const lessons = [
  "01-dung-canh-tam-giac-cat-near-plane",
  "02-signed-distance-va-half-space",
  "03-giao-diem-canh-va-near-plane",
  "04-clip-triangle-thanh-polygon",
  "05-chia-polygon-thanh-triangle",
  "06-project-va-rasterize-ket-qua",
  "07-sweep-qua-camera-va-validation",
  "08-canh-3d-va-ban-hoan-chinh",
];
test("Project 18 rebuild has eight teachable checkpoints with literal four-space source excerpts", async () => {
  const files = (await readdir(path.join(workspace, "content/near-plane-clipper")))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.deepEqual(
    files,
    lessons.map((slug) => slug + ".mdx"),
  );
  for (const [i, file] of files.entries()) {
    const mdx = await readFile(path.join(workspace, "content/near-plane-clipper", file), "utf8");
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
      // Một excerpt khớp source vẫn có thể bị cắt giữa khai báo struct/hàm.
      const stack = [];
      const pairs = { "}": "{", ")": "(", "]": "[" };
      for (const token of codeTokens(snippet)) {
        if (["{", "(", "["].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token))
          assert.equal(stack.pop(), pairs[token], file + ": incomplete block " + title);
      }
      assert.equal(stack.length, 0, file + ": unfinished block " + title);
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

test("Project 18 rebuild compiles every MDX lesson with real math, One Dark and Canvas plugins", async () => {
  for (const slug of lessons) {
    const source = await readFile(
      path.join(workspace, "content/near-plane-clipper", slug + ".mdx"),
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

test("Project 18 native implements true clipping, safe boundaries and a clean perspective scene", async () => {
  const get = (p) => readFile(path.join(root, p), "utf8");
  const clip = await get("final/include/clip.hpp"),
    raster = await get("final/include/raster.hpp"),
    view = await get("final/include/view.hpp"),
    main = await get("final/src/main.cpp"),
    controls = await get("final/include/controls.hpp"),
    tests = await get("tests/tests.cpp");
  for (const marker of [
    "std::optional<ClipVertex> intersectNearPlane",
    "d >= 0.0",
    "change == 0.0",
    "t < 0.0 || t > 1.0",
    "samePosition",
    "polygon.count > 4",
    "triangleAreaSquared",
    "clipForRender",
    "maximumNearPlaneViolation",
  ])
    assert.ok(clip.includes(marker), marker);
  assert.doesNotMatch(clip, /d >= -epsilon|std::clamp\(t|abs\(change\) <=/);
  assert.ok(raster.includes("vertex.position.z < nearPlane"));
  assert.ok(raster.indexOf("vertex.position.z < nearPlane") < raster.indexOf("focal"));
  assert.ok(view.indexOf("drawWorldGrid(image, scene)") < view.indexOf("if (scene.debug)"));
  assert.ok(view.includes("renderBatch = stats.clip.batch"));
  assert.ok(view.includes("projectTriangle(renderBatch.triangles[i]"));
  for (const key of ["SDLK_V", "SDLK_N", "SDLK_F", "SDLK_J", "SDLK_I"])
    assert.ok(controls.includes(key));
  for (const marker of [
    "event.motion.which == owner",
    "event.button.which == owner",
    "SDL_CaptureMouse(true)",
    "SDL_ConvertEventToRenderCoordinates",
    "SDL_WINDOW_HIGH_PIXEL_DENSITY",
    "SDL_LOGICAL_PRESENTATION_LETTERBOX",
    "SDL_EVENT_WINDOW_FOCUS_LOST",
  ])
    assert.ok(main.includes(marker), marker);
  for (const source of [clip, raster, view, main])
    assert.doesNotMatch(source, /SDL_RenderGeometry|glm::|glDraw/);
  for (const marker of [
    "analytic three-quarter retained area",
    "analytic one-quarter retained area",
    "tiny real crossing is not treated as parallel",
    "all six input permutations",
    "point contact produces no fake triangle",
    "edge contact produces no fake triangle",
    "raster mask matches independent ray-triangle near oracle",
    "clean scene retains projected world grid",
    "sweep stays exactly in kept half-space",
  ])
    assert.ok(tests.includes(marker), marker);
  assert.doesNotMatch(tests, /\bassert\s*\(/);
  assert.match(tests, /if \(failures != 0\)/);
  for (const [cp, name] of [
    [2, "signedDistance"],
    [3, "intersectNearPlane"],
    [4, "clipTriangleToNearPlane"],
    [5, "triangulateFan"],
    [6, "clipForRender"],
    [7, "maximumNearPlaneViolation"],
  ]) {
    const previous = await get(
      "checkpoints/" + String(cp - 1).padStart(2, "0") + "/include/clip.hpp",
    );
    const current = await get("checkpoints/" + String(cp).padStart(2, "0") + "/include/clip.hpp");
    assert.ok(!previous.includes(name + "("), name + " leaked before its lesson");
    assert.ok(current.includes(name + "("));
  }
});

test("Project 18 lessons teach learner-owned code and complete new helper definitions", async () => {
  for (let cp = 1; cp <= 8; cp++) {
    const mdx = await readFile(
      path.join(workspace, "content/near-plane-clipper", lessons[cp - 1] + ".mdx"),
      "utf8",
    );
    assert.ok(mdx.includes("--target project_18_starter --parallel 2"));
    assert.ok(mdx.includes("bản tham khảo sau bài"));
    const snippets = [
      ...mdx.matchAll(/\x60\x60\x60cpp title="[^"]+"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g),
    ].map((m) => m[1]);
    for (const file of ["clip.hpp", "scene.hpp", "view.hpp"]) {
      const dir = cp === 1 ? "starter" : "checkpoints/" + String(cp - 1).padStart(2, "0");
      const previous = await readFile(path.join(root, dir, "include", file), "utf8");
      const current = await readFile(
        path.join(root, "checkpoints", String(cp).padStart(2, "0"), "include", file),
        "utf8",
      );
      for (const sig of current.matchAll(
        /^(?:inline [^\r\n]+|Triangle3 presetTriangle[^\r\n]+) \{/gm,
      )) {
        if (previous.includes(sig[0])) continue;
        const tokens = codeTokens(current.slice(sig.index));
        let depth = 0,
          end = codeTokens(sig[0]).length - 1;
        for (; end < tokens.length; end++) {
          if (tokens[end] === "{") depth++;
          if (tokens[end] === "}" && --depth === 0) break;
        }
        assert.ok(
          snippets.some((s) => isContiguousCodeExcerpt(tokens.slice(0, end + 1).join(" "), s)),
          lessons[cp - 1] + ": missing " + sig[0],
        );
      }
    }
  }
  const last = await readFile(
    path.join(workspace, "content/near-plane-clipper", lessons[7] + ".mdx"),
    "utf8",
  );
  for (const token of [
    "Project 18 đã hoàn chỉnh",
    "target_include_directories(project_18_tests PRIVATE starter/include)",
    "ctest --test-dir build -C Debug",
    "ctest --test-dir build -C Release",
    "drawWorldGrid",
    "SDLK_F",
    "SDLK_J",
  ])
    assert.ok(last.includes(token), token);
  const manifest = await readFile(path.join(workspace, "course/projects/p18/manifest.ts"), "utf8");
  assert.doesNotMatch(manifest, /Cửa sổ chia làm hai/);
  assert.ok(manifest.includes("epsilon chỉ"));
});

test("Project 18 renders overview, eight lessons and complete runnable source", async () => {
  const overview = await render("/projects/near-plane-clipper");
  assert.equal(overview.status, 200);
  assert.match(await overview.text(), /Thử thách|thử tự làm/i);
  for (const slug of lessons) {
    const response = await render("/projects/near-plane-clipper/" + slug);
    assert.equal(response.status, 200, slug);
    const html = await response.text();
    assert.match(html, /data-theme="one-dark-pro"/);
    assert.doesNotMatch(html, /Checkpoint đang xây|Bài đang được xây lại/);
  }
  const html = await (await render("/projects/near-plane-clipper/" + lessons.at(-1))).text();
  for (const file of [
    "types.hpp",
    "clip.hpp",
    "raster.hpp",
    "scene.hpp",
    "controls.hpp",
    "framebuffer.hpp",
    "view.hpp",
    "presentation.hpp",
    "src/main.cpp",
    "tests/tests.cpp",
  ])
    assert.ok(html.includes(file), file);
  for (const label of [
    "Camera X",
    "Camera Z",
    "Ẩn debug",
    "Toàn bộ mã nguồn của dự án",
    "project-18-near-plane-clipper.zip",
    "projects/lambert-tetrahedron",
  ])
    assert.ok(html.includes(label), label);
  await assertPublishedProjectSources("18", root);
});
