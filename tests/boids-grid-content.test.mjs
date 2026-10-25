import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { codeTokens, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { lessonSectionUsages } from "../scripts/mdx-contracts.mjs";

const content = new URL("../content/boids-spatial-grid/", import.meta.url);
const root = new URL("../examples/project-28-boids-spatial-grid/", import.meta.url);
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

test("P28 ten lessons compile, teach connected code and quote the exact staged native source", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(files.length, 10);
  let excerpts = 0;
  for (const [index, file] of files.entries()) {
    const source = await readFile(new URL(file, content), "utf8");
    assert.equal(lessonSectionUsages(source).length, 7, file);
    assert.ok((source.match(/^### Bước /gm) ?? []).length >= 3, file);
    assert.ok((source.match(/^```(?:cpp|cmake|bash) title="/gm) ?? []).length >= 3, file);
    assert.match(source, /<InteractiveLab demo="boids-spatial-grid" mode="grid-/);
    assert.doesNotMatch(source, /TODO|Checkpoint đang xây|100\.000 hạt/);
    assert.ok(Buffer.byteLength(source) < 32 * 1024, file);
    for (const [, title, code] of source.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      const template = await readFile(
        new URL(relative.startsWith("tests/") ? relative : "source-template/" + relative, root),
        "utf8",
      );
      assert.ok(
        isContiguousCodeExcerpt(code, render(template, index + 1, relative)),
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
    const compiled = String(await compile(source, courseMdxOptions));
    assert.match(compiled, /one-dark-pro/);
  }
  assert.ok(excerpts >= 28);
  const final = await readFile(new URL(files.at(-1), content), "utf8");
  assert.match(final, /ctest[^\r\n]+-C Debug/);
  assert.match(final, /ctest[^\r\n]+-C Release/);
  assert.match(final, /PRIVATE starter\/include/);
  assert.match(final, /--smoke-large/);
});
