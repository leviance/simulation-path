import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { lessonSectionUsages } from "../scripts/mdx-contracts.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";

const root = new URL("../examples/project-30-point-cloud-octree/", import.meta.url);
const content = new URL("../content/point-cloud-octree/", import.meta.url);
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
test("P30 eleven lessons compile with One Dark and complete contiguous staged C++ excerpts", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(files.length, 11);
  let excerpts = 0;
  for (const [index, file] of files.entries()) {
    const text = await readFile(new URL(file, content), "utf8");
    assert.equal(lessonSectionUsages(text).length, 7, file);
    assert.ok(Buffer.byteLength(text) <= 32 * 1024, file);
    assert.ok((text.match(/^### Bước /gm) ?? []).length >= 3, file);
    assert.doesNotMatch(text, /TODO|Checkpoint đang xây|octree-octants/);
    for (const [, title, code] of text.matchAll(/```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g)) {
      const relative = title.split(" — ")[0];
      const original = await readFile(
        new URL(relative.startsWith("tests/") ? relative : "source-template/" + relative, root),
        "utf8",
      );
      assert.ok(
        isContiguousCodeExcerpt(code, render(original, index + 1, relative)),
        file + " / " + title,
      );
      const stack = [],
        pairs = { ")": "(", "]": "[", "}": "{" };
      for (const token of codeTokens(code)) {
        if (["(", "[", "{"].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token)) assert.equal(stack.pop(), pairs[token], file);
      }
      assert.equal(stack.length, 0, file);
      for (const line of code.split("\n"))
        if (line.trim()) assert.equal(line.match(/^ */)[0].length % 4, 0, title);
      excerpts++;
    }
    assert.match(String(await compile(text, courseMdxOptions)), /one-dark-pro/);
  }
  assert.ok(excerpts >= 34);
});
test("P30 core changes appear in their teaching checkpoints, not only hidden runtime feature flags", async () => {
  const stage = async (file, number) =>
    render(await readFile(new URL("source-template/include/" + file, root), "utf8"), number, file);
  assert.doesNotMatch(await stage("io/csv.hpp", 0), /CSV row/);
  assert.match(await stage("io/csv.hpp", 1), /CSV row/);
  assert.doesNotMatch(await stage("spatial/octree.hpp", 3), /void split\(/);
  assert.match(await stage("spatial/octree.hpp", 4), /void split\(/);
  assert.doesNotMatch(await stage("spatial/octree.hpp", 4), /pending\.pop_back/);
  assert.match(await stage("spatial/octree.hpp", 5), /pending\.pop_back/);
  assert.doesNotMatch(await stage("survey/scene.hpp", 5), /scene\.visible = scene\.tree\.query/);
  assert.match(await stage("survey/scene.hpp", 6), /scene\.visible = scene\.tree\.query/);
  assert.doesNotMatch(await stage("survey/statistics.hpp", 6), /total = total \+ p/);
  assert.match(await stage("survey/statistics.hpp", 7), /total = total \+ p/);
  assert.doesNotMatch(await stage("io/files.hpp", 7), /suffix <= 10000/);
  assert.match(await stage("io/files.hpp", 8), /suffix <= 10000/);
  assert.doesNotMatch(await stage("survey/validation.hpp", 8), /stored\[pointIndex\]/);
  assert.match(await stage("survey/validation.hpp", 9), /stored\[pointIndex\]/);
  assert.doesNotMatch(await stage("survey/benchmark.hpp", 9), /job\.samples\.push_back/);
  assert.match(await stage("survey/benchmark.hpp", 10), /job\.samples\.push_back/);
});
