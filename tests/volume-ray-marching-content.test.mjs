import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { markedCodeExcerpt, isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { lessonSections } from "../lib/lesson-sections.mjs";
import { lessonSectionUsages } from "../scripts/mdx-contracts.mjs";
const project = path.resolve("examples/project-54-volume-ray-marching");
const read = (file) => readFileSync(path.join(project, file), "utf8");
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(path.join(directory, entry.name))
      : [path.join(directory, entry.name)],
  );
}
test("P54 ten connected lessons have all teaching roles and 34 exact C++/GLSL checkpoint excerpts", () => {
  const lessons = readdirSync("content/volume-ray-marching")
    .filter((file) => file.endsWith(".mdx"))
    .sort();
  assert.equal(lessons.length, 10);
  let count = 0;
  for (const file of lessons) {
    const source = readFileSync(path.join("content/volume-ray-marching", file), "utf8");
    assert.deepEqual(
      lessonSectionUsages(source).map((section) => section.key),
      lessonSections.map((section) => section.key),
      file,
    );
    assert.ok((source.match(/^### /gm) ?? []).length >= 3, file);
    assert.ok((source.match(/^\d+\. /gm) ?? []).length >= 2, file);
    assert.match(source, new RegExp('mode="fog54-' + Number(file.slice(0, 2)) + '"'));
    assert.doesNotMatch(source, /Đồng bộ từ checkpoint|TODO|TBD/);
    const blocks = [
      ...source.matchAll(
        /\{\/\* snippet ([^#]+)#([a-z0-9-]+) \*\/\}\s*```(cpp|glsl) title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
      ),
    ];
    assert.ok(blocks.length >= 3, file + " needs three explained source excerpts");
    assert.equal(blocks.length, [...source.matchAll(/```(?:cpp|glsl) /g)].length, file);
    for (const [, relative, id, language, title, code] of blocks) {
      assert.equal(title.split(" — ")[0], relative);
      assert.equal(language === "glsl", relative.startsWith("shaders/"));
      const directory = relative.startsWith("tests/")
        ? project
        : path.join(project, "checkpoints", file.slice(0, 2));
      const actual = readFileSync(path.join(directory, relative), "utf8");
      assert.equal(code.replace(/\r/g, ""), markedCodeExcerpt(actual, id), file + "#" + id);
      assert.ok(isContiguousCodeExcerpt(code, actual), file + "#" + id);
      count++;
    }
  }
  assert.equal(count, 34);
});
test("P54 all twelve snapshots resolve authoring stages and retain readable four-space C++", () => {
  for (const snapshot of [
    "starter",
    ...Array.from({ length: 10 }, (_, i) => "checkpoints/" + String(i + 1).padStart(2, "0")),
    "final",
  ]) {
    for (const file of walk(path.join(project, snapshot))) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(source, /LAB_CHECKPOINT|if constexpr/, file);
      if (!/\.(hpp|cpp)$/.test(file)) continue;
      assert.doesNotMatch(source, /\t|\?[^\n]*:/, file);
      for (const line of source.split(/\r?\n/))
        assert.equal((line.match(/^ +(?=\S)/)?.[0].length ?? 0) % 4, 0, file);
    }
  }
});
test("P54 algorithms appear at the stage that teaches them, rather than shipping the final shader in the starter", () => {
  for (const [stage, file, symbol] of [
    [1, "include/renderer.hpp", "void resize("],
    [2, "include/model.hpp", "inline Ray cameraRay("],
    [3, "include/model.hpp", "boxInterval("],
    [4, "include/volume.hpp", "class Volume"],
    [5, "include/reference.hpp", "inline Result integrate("],
    [6, "include/reference.hpp", "segmentAlpha("],
    [7, "shaders/volume.frag", "vec3 lightColor("],
    [8, "include/reference.hpp", "result.profile.push_back"],
    [9, "shaders/volume.frag", "uEarly != 0"],
    [10, "include/validation.hpp", "inline void verifyGpu("],
  ]) {
    const current = read(`checkpoints/${String(stage).padStart(2, "0")}/${file}`),
      before = read(
        `${stage === 1 ? "starter" : "checkpoints/" + String(stage - 1).padStart(2, "0")}/${file}`,
      );
    assert.ok(current.includes(symbol), symbol);
    assert.ok(!before.includes(symbol), symbol + " leaked early");
  }
});
test("P54 final source meets actual scale, three reducers, full viewport, cancellation and CPU/GPU separation", () => {
  assert.match(read("final/include/state.hpp"), /side = 128/);
  const renderer = read("final/include/renderer.hpp");
  assert.match(renderer, /GL_R32F/);
  assert.match(renderer, /side, side, side/);
  assert.match(renderer, /GL_RGBA32F/);
  assert.match(renderer, /4194304/);
  assert.match(renderer, /GL_QUERY_RESULT_AVAILABLE/);
  const shader = read("final/shaders/volume.frag");
  for (const pattern of [
    /uniform sampler3D/,
    /maximum = max/,
    /integral \/ length/,
    /transmittance \*= segmentT/,
    /uMode == 2 && uEarly/,
    /i < 512/,
  ])
    assert.match(shader, pattern);
  assert.match(read("final/include/benchmark.hpp"), /15000/);
  assert.match(read("final/include/benchmark.hpp"), /repetition_ == 5/);
  assert.match(read("final/include/benchmark.hpp"), /results.clear\(\)/);
  assert.match(read("final/include/input.hpp"), /event.motion.state & SDL_BUTTON_LMASK/);
  const harness = read("tests/tests.cpp");
  assert.doesNotMatch(harness, /#include\s*<cassert>|\bassert\(/);
  assert.match(harness, /void check\(bool condition, std::string_view reason\)/);
  assert.match(harness, /if \(failures != 0\)[\s\S]*return EXIT_FAILURE;/);
  assert.match(harness, /known slab/);
  const last = readFileSync("content/volume-ray-marching/10-kiem-chung-va-hoan-thien.mdx", "utf8");
  assert.match(last, /24×18/);
  assert.match(last, /0,0025/);
  assert.match(last, /CPU\/GPU/);
  const jobs = readFileSync("lib/labs/volume-ray-marching/jobs.ts", "utf8");
  assert.match(jobs, /throwIfAborted/);
  assert.match(jobs, /20000/);
  assert.match(jobs, /pixels < 128/);
});

test("P54 all ten lessons compile through the real One Dark and math MDX pipeline", async () => {
  for (const file of readdirSync("content/volume-ray-marching").filter((name) =>
    name.endsWith(".mdx"),
  )) {
    const source = readFileSync(path.join("content/volume-ray-marching", file), "utf8");
    const compiled = String(await compile(source, courseMdxOptions));
    assert.match(compiled, /one-dark-pro/, file);
    assert.match(compiled, /InteractiveLab/, file);
  }
});
