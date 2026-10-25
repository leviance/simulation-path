import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { lessonSectionUsages } from "../scripts/mdx-contracts.mjs";

const content = new URL("../content/quadtree-map-editor/", import.meta.url);
const root = new URL("../examples/project-29-quadtree-map-editor/", import.meta.url);
const generator = await readFile(
  new URL("../scripts/generate-checkpoints.mjs", import.meta.url),
  "utf8",
);
const render = vm.runInNewContext(
  generator.slice(
    generator.indexOf("function evaluate("),
    generator.indexOf("function snapshotDefinitions("),
  ) + "\nrenderTemplate",
);
const read = (file) => readFile(new URL(file, root), "utf8");

test("P29 eleven lessons compile and quote contiguous, balanced four-space staged source", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(files.length, 11);
  let excerpts = 0;
  for (const [index, file] of files.entries()) {
    const source = await readFile(new URL(file, content), "utf8");
    assert.equal(lessonSectionUsages(source).length, 7, file);
    assert.ok((source.match(/^### Bước /gm) ?? []).length >= 3, file);
    assert.ok(Buffer.byteLength(source) <= 32 * 1024, file);
    assert.match(source, /<InteractiveLab demo="quadtree-map-editor" mode="map-/);
    assert.doesNotMatch(source, /TODO|Checkpoint đang xây|visible-quadtree/);
    for (const [, title, code] of source.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      const original = await read(
        relative.startsWith("tests/") ? relative : "source-template/" + relative,
      );
      assert.ok(
        isContiguousCodeExcerpt(code, render(original, index + 1, relative)),
        file + " / " + title,
      );
      const stack = [],
        pairs = { ")": "(", "]": "[", "}": "{" };
      for (const token of codeTokens(code)) {
        if (["(", "[", "{"].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token)) assert.equal(stack.pop(), pairs[token], title);
      }
      assert.equal(stack.length, 0, title);
      for (const line of code.split("\n"))
        if (line.trim()) assert.equal(line.match(/^ */)[0].length % 4, 0, title);
      excerpts++;
    }
    assert.match(String(await compile(source, courseMdxOptions)), /one-dark-pro/);
  }
  assert.ok(excerpts >= 34);
  const first = await readFile(new URL(files[0], content), "utf8");
  for (const symbol of [
    "Object",
    "makeObjects",
    "drawObject",
    "presentFrame",
    "SDL_UpdateTexture",
    "starter",
  ])
    assert.ok(first.includes(symbol), symbol);
  const last = await readFile(new URL(files.at(-1), content), "utf8");
  assert.match(last, /ctest[^\r\n]+-C Debug/);
  assert.match(last, /ctest[^\r\n]+-C Release/);
  assert.match(last, /PRIVATE starter\/include/);
  assert.match(last, /--smoke-workflow/);
  assert.match(last, /project_29_final.exe/);
  assert.doesNotMatch(
    (await Promise.all(files.map((file) => readFile(new URL(file, content), "utf8")))).join("\n"),
    /project_29_checkpoint_0\d|project_29\.exe/,
  );
});

test("P29 native tree, editing and jobs materialize at the lesson where they are taught", async () => {
  async function walk(directory) {
    const result = [];
    for (const entry of await readdir(new URL(directory, root), { withFileTypes: true })) {
      const file = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) result.push(...(await walk(file + "/")));
      else result.push(file);
    }
    return result;
  }
  for (const file of [...(await walk("source-template/")), "tests/tests.cpp"]) {
    const source = await read(file);
    assert.ok((await stat(new URL(file, root))).size <= 32 * 1024, file);
    for (const line of source.split(/\r?\n/))
      if (line.trim() && !line.trimStart().startsWith("#"))
        assert.equal(line.match(/^ */)[0].length % 4, 0, file);
    for (let stage = 0; stage <= 11; stage++)
      assert.doesNotMatch(render(source, stage, file), /LAB_CHECKPOINT/, file);
  }
  const stage = async (file, cp) => render(await read("source-template/include/" + file), cp, file);
  assert.doesNotMatch(await stage("model/dataset.hpp", 0), /for \(std::size_t index/);
  assert.match(await stage("model/dataset.hpp", 1), /count.*maximumObjects/s);
  assert.doesNotMatch(await stage("spatial/quadtree.hpp", 3), /void split\(/);
  assert.match(await stage("spatial/quadtree.hpp", 4), /void split\(/);
  assert.doesNotMatch(await stage("spatial/quadtree.hpp", 4), /Query query\(/);
  assert.match(await stage("spatial/quadtree.hpp", 5), /Query query\(/);
  assert.doesNotMatch(
    await stage("editor/scene.hpp", 5),
    /scene\.visible = scene\.document\.query/,
  );
  assert.match(await stage("editor/scene.hpp", 6), /scene\.visible = scene\.document\.query/);
  assert.doesNotMatch(await stage("spatial/quadtree.hpp", 6), /bool translateGroup/);
  assert.match(await stage("spatial/quadtree.hpp", 7), /bool translateGroup/);
  assert.doesNotMatch(await stage("editor/scene.hpp", 7), /Query preview =/);
  assert.match(await stage("editor/scene.hpp", 8), /Query preview =/);
  assert.doesNotMatch(await stage("editor/validation.hpp", 8), /void tickValidation/);
  assert.match(await stage("editor/validation.hpp", 9), /void tickValidation/);
  assert.doesNotMatch(await stage("editor/benchmark.hpp", 9), /void tickBenchmark/);
  assert.match(await stage("editor/benchmark.hpp", 10), /void tickBenchmark/);
  const app = await stage("app/application.hpp", 11);
  assert.match(app, /SDL_ConvertEventToRenderCoordinates/);
  assert.match(app, /SDL_CaptureMouse\(true\)/);
  assert.match(app, /which == pointer.owner/);
  assert.match(app, /endGesture\(scene, boardToScreen\(\{event.button.x, event.button.y\}\)\)/);
  assert.match(app, /scene.drawn != scene.visible.ids.size\(\)/);
  assert.match(app, /tick >= 2000/);
  assert.match(app, /20000/);
  const nativeTests = await read("tests/tests.cpp");
  for (const phrase of [
    "interval-gap oracle",
    "100000 real",
    "each ID stored exactly once",
    "pointer-up position",
    "stale",
    "rollback",
    "EXIT_FAILURE",
  ])
    assert.ok(nativeTests.includes(phrase), phrase);
  const readme = await read("README.md");
  assert.match(readme, /project_29_final/);
  assert.match(readme, /100\.000/);
});
