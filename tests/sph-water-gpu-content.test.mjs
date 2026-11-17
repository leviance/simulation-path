import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { markedCodeExcerpt, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { lessonSections } from "../lib/lesson-sections.mjs";
import { lessonSectionUsages } from "../scripts/mdx-contracts.mjs";
const root = path.resolve(import.meta.dirname, ".."),
  project = path.join(root, "examples/project-51-sph-water-gpu");

test("P51 each lesson has ordered teaching roles, explained steps and two observable experiments", async () => {
  const directory = path.join(root, "content/sph-water-gpu");
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".mdx"))) {
    const source = await readFile(path.join(directory, file), "utf8");
    const sections = lessonSectionUsages(source);
    assert.deepEqual(
      sections.map((section) => section.key),
      lessonSections.map((section) => section.key),
      file,
    );
    const roles = Object.fromEntries(sections.map((section) => [section.key, section]));
    const implementation = source.slice(roles.code.end, roles.experiments.start);
    assert.ok((implementation.match(/^### \S.+$/gm) ?? []).length >= 3, file);
    const experiments = source.slice(roles.experiments.end, roles.validation.start);
    assert.ok((experiments.match(/^\d+\. /gm) ?? []).length >= 2, file);
    assert.match(source, /```cpp title="[^"]+"\r?\n/, file);
    assert.doesNotMatch(source, /\\\\(?:times|approx|Delta|sqrt|lceil|rceil|le)\b/, file);
    assert.ok(roles.model.end < source.indexOf("<InteractiveLab"), file);
    assert.ok(source.indexOf("<InteractiveLab") < roles.code.start, file);
    for (const line of source.split(/\r?\n/)) {
      if (line.startsWith(".") && line.includes("project_51"))
        assert.ok(!line.includes("\\\\"), file);
    }
  }
});

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target)));
    else files.push(target);
  }
  return files;
}

test("P51 snapshots remove authoring branches and final C++ retains readable complete source", async () => {
  for (const snapshot of [
    "starter",
    ...Array.from({ length: 13 }, (_, i) => `checkpoints/${String(i + 1).padStart(2, "0")}`),
    "final",
  ]) {
    for (const file of await walk(path.join(project, snapshot))) {
      const source = await readFile(file, "utf8");
      assert.doesNotMatch(source, /LAB_CHECKPOINT|if constexpr/, file);
      if (snapshot !== "final" || !/\.(?:hpp|cpp)$/.test(file)) continue;
      assert.match(source, /^\s*\/\/ /m, file);
      assert.ok((source.match(/\r?\n\s*\r?\n/g) ?? []).length >= 2, file);
      assert.doesNotMatch(source, /\t/, file);
      for (const line of source.split(/\r?\n/))
        assert.equal((line.match(/^ +(?=\S)/)?.[0].length ?? 0) % 4, 0, file);
    }
  }
  const harness = await readFile(path.join(project, "tests/tests.cpp"), "utf8");
  assert.doesNotMatch(harness, /#include\s*<cassert>|\bassert\s*\(/);
  assert.match(harness, /if \(failures != 0\)[\s\S]*?return EXIT_FAILURE;/);
  assert.match(harness, /return EXIT_SUCCESS;/);
});
test("P51 all 52 C++/GLSL teaching blocks match exact checkpoint markers", async () => {
  const files = (await readdir(path.join(root, "content/sph-water-gpu")))
    .filter((x) => /^\d{2}-.+\.mdx$/.test(x))
    .sort();
  assert.equal(files.length, 13);
  let count = 0;
  for (const file of files) {
    const text = await readFile(path.join(root, "content/sph-water-gpu", file), "utf8");
    const blocks = [
      ...text.matchAll(
        /\{\/\* snippet ([\w./-]+)#([a-z0-9-]+) \*\/\}\s*\x60\x60\x60(cpp|glsl) title="([^"]+)"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g,
      ),
    ];
    assert.equal(blocks.length, [...text.matchAll(/\x60\x60\x60(?:cpp|glsl) title=/g)].length);
    assert.ok(blocks.length >= 4);
    for (const [, relative, id, language, title, code] of blocks) {
      assert.equal(title.split(" — ")[0], relative);
      assert.equal(language === "glsl", relative.startsWith("shaders/"));
      const source = await readFile(
        path.join(project, "checkpoints", file.slice(0, 2), relative),
        "utf8",
      );
      assert.equal(code, markedCodeExcerpt(source, id), file + "#" + id);
      assert.ok(isContiguousCodeExcerpt(code, source));
      count++;
    }
  }
  assert.ok(count >= 52);
});
test("P51 native guarantees explicit workload, finite queues and independent references", async () => {
  const read = (file) => readFile(path.join(project, "final", file), "utf8");
  const engine = await read("include/gpu/engine.hpp");
  assert.match(engine, /ClientWaitSync\(fence_, 0, 0\)/);
  assert.match(engine, /seconds\(5\)/);
  assert.match(engine, /meta_\.updated != model\(\)\.count/);
  assert.match(engine, /committed_ = candidate_/);
  assert.doesNotMatch(engine, /glFinish/);
  const renderer = await read("include/render/water.hpp");
  assert.match(renderer, /DrawArraysInstanced/);
  assert.match(renderer, /s\.model\.count/);
  assert.doesNotMatch(renderer, /stride|drawCap/);
  assert.match(await read("shaders/water/sphere.frag"), /gl_FragDepth/);
  assert.match(await read("shaders/water/composite.frag"), /water-optics/);
  const reference = await read("include/fluid/reference.hpp");
  assert.doesNotMatch(reference, /indices|offsets|FluidGrid/);
  assert.match(reference, /model.count > 1024/);
  assert.match(await read("include/app/verification.hpp"), /fixture < 6/);
  const benchmark = await read("include/app/benchmark.hpp");
  assert.match(benchmark, /warmed_ == 30/);
  assert.match(benchmark, /compute.size\(\) == 8/);
  assert.match(benchmark, /render.size\(\) == 8/);
  assert.match(benchmark, /seconds\(50\)/);
  const main = await read("src/main.cpp");
  assert.match(main, /benchmark\.active\(\) \|\| controls\.benchmark/);
  assert.match(
    main,
    /SDL_EVENT_WINDOW_FOCUS_LOST[\s\S]*?benchmark\.cancel\(\);\s*controls\.benchmark = false;/,
  );
});
test("P51 teaching names limits honestly and links complete runnable sources", async () => {
  const final = await readFile(
    path.join(root, "content/sph-water-gpu/13-kiem-chung-va-hoan-thien.mdx"),
    "utf8",
  );
  for (const option of ["--verify", "--time 0.30", "--seconds", "--benchmark", "-C Release"])
    assert.ok(final.includes(option), option);
  assert.match(final, /ctest[^\r\n]+-C Debug/);
  assert.match(final, /không chứng nhận solver nước/);
  const manifest = await readFile(path.join(root, "course/projects/p51/manifest.ts"), "utf8");
  for (const phrase of ["110.592", "166,375", "192 MiB", "1.000.000", "Canvas CPU"])
    assert.ok(manifest.includes(phrase), phrase);
  assert.doesNotMatch(manifest, /216 hạt|Tổng mass 64 kg|world \[0,1\]³/);
});
