import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import "./projects-34-viewer.cases.mjs";

const root = new URL("../", import.meta.url),
  dir = "examples/project-34-dual-renderer-cube/";
const read = (path) => readFile(new URL(path, root), "utf8");

test("P34 publishes a real OBJ viewer with nine substantive source-aligned lessons", async () => {
  const catalog = JSON.parse(await read("course/projects.json"));
  const project = catalog.find((p) => p.id === "34");
  assert.equal(project.checkpointCount, 9);
  assert.equal(project.contentRevision, 2);
  const manifest = (await import("../course/projects/p34/manifest.ts")).default;
  assert.equal(manifest.lessons.length, 9);
  assert.match(manifest.prerequisites.join(" "), /Project 21/);
  assert.match(manifest.challenge.requirements.join(" "), /2.976/);
  assert.doesNotMatch(manifest.summary, /indexed cube|CubeScene/);
  for (const lesson of manifest.lessons) {
    const text = await read("content/dual-renderer-cube/" + lesson.slug + ".mdx");
    assert.ok(text.includes("# " + lesson.title));
    assert.match(text, /## Vấn đề cần giải quyết/);
    assert.match(text, /## Tự kiểm tra kết quả/);
    assert.doesNotMatch(text, /\{\{CPP|\{\{GLSL/, "No unresolved source markers");
    const blocks = [...text.matchAll(/```cpp title="([^"]+)"\n([\s\S]*?)\n```/g)];
    assert.ok(blocks.length >= 1, lesson.slug + " needs actual detailed code");
    for (const [, title, snippet] of blocks) {
      const file = title.split(" — ")[0];
      const source = await read(
        dir + "checkpoints/" + String(lesson.order).padStart(2, "0") + "/" + file,
      );
      assert.ok(
        isContiguousCodeExcerpt(snippet, source),
        lesson.slug + ": " + title + " is not contiguous checkpoint code",
      );
      const stack = [];
      for (const token of codeTokens(snippet)) {
        if (token === "{") stack.push(token);
        if (token === "}") assert.ok(stack.pop(), title + " has unmatched }");
      }
      assert.equal(stack.length, 0, title + " contains an unfinished code block");
    }
    for (const [, snippet] of text.matchAll(/```glsl title="[^"]+"\n([\s\S]*?)\n```/g)) {
      const gpu = await read(
        dir + "checkpoints/" + String(lesson.order).padStart(2, "0") + "/include/viewer-gpu.hpp",
      );
      assert.ok(gpu.includes(snippet.trim()), "GLSL must be exact source");
    }
  }
  assert.equal(
    (await readdir(new URL("content/dual-renderer-cube/", root))).filter((p) => p.endsWith(".mdx"))
      .length,
    9,
  );
});

test("P34 keeps complete CPU/GPU/resource/timing proof in the independent source", async () => {
  const source = await read(dir + "source-template/include/viewer-validation.hpp");
  for (const expected of [
    "repeat < 24",
    "repeat == 20",
    "verifyViewerVertexTrace",
    "readViewerComparison",
    "requireViewerResources",
    "viewerVisibilityFixture",
    "viewerNearFixture",
  ])
    assert.ok(source.includes(expected), expected);
  const cpu = await read(dir + "source-template/include/viewer-cpu.hpp");
  assert.match(cpu, /plane < 6/);
  assert.match(cpu, /clipViewerTriangle/);
  const timing = await read(dir + "source-template/include/viewer-timing.hpp");
  assert.ok(timing.indexOf("GL_QUERY_RESULT_AVAILABLE") < timing.lastIndexOf("GL_QUERY_RESULT,"));
  const benchmark = await read(dir + "source-template/include/viewer-benchmark.hpp");
  for (const expected of [
    "SDL_GL_GetSwapInterval",
    "gl.Finish()",
    "samples = 12",
    "warmup = 3",
    "sync_wait_cpu",
    "No speedup ratio",
    "15000",
  ])
    assert.ok(benchmark.includes(expected), expected);
  const app = await read(dir + "source-template/include/viewer-application.hpp");
  assert.match(app, /SDLK_F1/);
  assert.match(app, /SDLK_F2/);
  assert.match(app, /SDL_GetWindowSizeInPixels/);
  assert.match(app, /SDL_CaptureMouse/);
  const pipeline = await read(dir + "source-template/include/pipeline.hpp");
  assert.doesNotMatch(pipeline, /kCubeVertices|CubeScene|rasterizeCpuCube/);
  const canvas = await read("components/labs/dual-renderer-cube-lab.tsx");
  for (const expected of [
    "viewerModels",
    "setPointerCapture",
    "onLostPointerCapture",
    "useReducedMotion",
    "--verify",
    "không đo tốc độ GPU",
  ])
    assert.ok(canvas.includes(expected), expected);
});
