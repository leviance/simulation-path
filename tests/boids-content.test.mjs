import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { isContiguousCodeExcerpt, codeTokens } from "../scripts/code-snippets.mjs";
import { lessonSectionUsages } from "../scripts/mdx-contracts.mjs";

const root = new URL("../examples/project-27-boids-2d/", import.meta.url);
const content = new URL("../content/boids-2d/", import.meta.url);
const generator = await readFile(
  new URL("../scripts/generate-checkpoints.mjs", import.meta.url),
  "utf8",
);
// Dùng đúng materializer hiện tại, không sửa generator để bỏ qua catalog validation.
const renderTemplate = vm.runInNewContext(
  generator.slice(
    generator.indexOf("function evaluate("),
    generator.indexOf("function snapshotDefinitions("),
  ) + "\nrenderTemplate",
);
const read = (file) => readFile(new URL(file, root), "utf8");

test("Boids nine MDX lessons compile with seven sections and literal staged C++ snippets", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(files.length, 9);
  let excerpts = 0;
  for (const [index, file] of files.entries()) {
    const source = await readFile(new URL(file, content), "utf8");
    assert.equal(lessonSectionUsages(source).length, 7, file);
    assert.match(source, /<InteractiveLab demo="boids-2d" mode="boids-/);
    assert.match(source, /project_27_starter/);
    assert.doesNotMatch(source, /TODO|Checkpoint đang xây|kính lúp/);
    let count = 0;
    for (const [, title, code] of source.matchAll(
      /```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
    )) {
      const relative = title.split(" — ")[0];
      const authored = await read(
        relative.startsWith("tests/") ? relative : "source-template/" + relative,
      );
      const staged = renderTemplate(authored, index + 1, relative);
      assert.ok(isContiguousCodeExcerpt(code, staged), file + " / " + title);
      const stack = [],
        pairs = { ")": "(", "]": "[", "}": "{" };
      for (const token of codeTokens(code)) {
        if (["(", "[", "{"].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token)) assert.equal(stack.pop(), pairs[token], title);
      }
      assert.equal(stack.length, 0, title);
      for (const line of code.split("\n")) {
        if (line.trim()) assert.equal(line.match(/^ */)[0].length % 4, 0, file + " indentation");
      }
      excerpts++;
      count++;
    }
    assert.ok(count >= 1, file);
    assert.ok((source.match(/^### Bước /gm) ?? []).length >= 3, file + " explained steps");
    assert.ok(
      (source.match(/^```(?:cpp|glsl|cmake|bash) title="[^"]+"$/gm) ?? []).length >= 3,
      file + " titled code blocks",
    );
    if (index === 8) {
      assert.match(source, /ctest[^\r\n]+-C Debug/, "final lesson teaches Debug CTest");
      assert.match(source, /ctest[^\r\n]+-C Release/, "final lesson teaches Release CTest");
      assert.match(source, /PRIVATE starter\/include/, "learner can test their completed starter");
    }
    assert.ok(source.length < 32 * 1024, file + " size budget");
    try {
      assert.match(String(await compile(source, courseMdxOptions)), /one-dark-pro/);
    } catch (error) {
      throw new Error(file + ": " + error.message, { cause: error });
    }
  }
  assert.ok(excerpts >= 20);
});

test("Boids lessons teach the helper definitions and SDL wiring needed by the starter", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  const expected = [
    ["integrateBoid", "drawBoid", "stepScene"],
    ["class Random", "makeFlock", "validateBoids", "SDLK_1", "SDLK_P"],
    ["minimumImage", "displacement", "findNeighbors", "drawRadius", "drawScene", "SDLK_T"],
    ["struct Steering", "desiredSteering", "overlapDirection", "drawArrow", "drawScene", "SDLK_Q"],
    ["velocitySum", "computeSteering", "SDLK_W", "SDLK_S"],
    ["offsetSum", "computeSteering", "SDLK_E", "SDLK_D"],
    ["stepBoids", "advanceScene", "stopScene", "SDLK_Y", "SDLK_U"],
    [
      "struct BenchmarkJob",
      "createBenchmark",
      "median",
      "tickBenchmark",
      "stopScene",
      "advanceScene",
      "SDLK_B",
      "SDLK_ESCAPE",
    ],
    ["void check", "bool near", "void testFixtures", "oracle"],
  ];
  for (const [index, file] of files.entries()) {
    const source = await readFile(new URL(file, content), "utf8");
    const cpp = [...source.matchAll(/```cpp[^\r\n]*\r?\n([\s\S]*?)\r?\n```/g)]
      .map((match) => match[1])
      .join("\n");
    for (const token of expected[index]) assert.ok(cpp.includes(token), file + " missing " + token);
  }
});

test("Boids staged sources contain no future algorithms or unresolved checkpoint flags", async () => {
  for (const [stage, file, absent] of [
    [0, "flock.hpp", "class Random"],
    [1, "flock.hpp", "makeFlock("],
    [2, "neighbors.hpp", "findNeighbors("],
    [3, "steering.hpp", "desiredSteering("],
    [4, "steering.hpp", "velocitySum"],
    [5, "steering.hpp", "offsetSum"],
    [7, "benchmark.hpp", "tickBenchmark("],
  ]) {
    const source = await read("source-template/include/" + file);
    const staged = renderTemplate(source, stage, file);
    assert.ok(!staged.includes(absent), String(stage) + " leaks " + absent);
    assert.ok(!staged.includes("LAB_CHECKPOINT"));
  }
  const starter = renderTemplate(await read("source-template/include/lab.hpp"), 0, "lab.hpp");
  assert.match(starter, /return boid;/);
  const final = renderTemplate(
    await read("source-template/include/steering.hpp"),
    9,
    "steering.hpp",
  );
  assert.match(final, /steering\.separation/);
  assert.match(final, /steering\.alignment/);
  assert.match(final, /steering\.cohesion/);
  const tests = await read("tests/tests.cpp");
  assert.doesNotMatch(tests, /#include\s*<cassert>|\bassert\s*\(/);
  assert.match(tests, /independent nine-image oracle/);
  assert.match(tests, /return EXIT_FAILURE/);
});

test("Boids authored files respect per-project size budgets", async () => {
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else assert.ok((await stat(file)).size <= 32 * 1024, file);
    }
  }
  await walk(fileURLToPath(new URL("source-template/", root)));
  for (const file of ["manifest.ts", "learning.ts", "lab.ts"]) {
    const info = await stat(new URL("../course/projects/p27/" + file, import.meta.url));
    assert.ok(info.size <= 20 * 1024, file);
  }
});
