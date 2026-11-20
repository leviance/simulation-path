import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { markedCodeExcerpt } from "../scripts/code-snippets.mjs";
import { lessonSections } from "../lib/lesson-sections.mjs";
import { lessonSectionUsages } from "../scripts/mdx-contracts.mjs";
const project = path.resolve("examples/project-53-volume-slicer");
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  });
}
test("P53 nine new lessons teach connected steps and every C++ block matches its exact checkpoint marker", () => {
  const lessons = readdirSync("content/volume-slicer")
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  assert.equal(lessons.length, 9);
  let count = 0;
  for (const file of lessons) {
    const body = readFileSync(path.join("content/volume-slicer", file), "utf8");
    assert.deepEqual(
      lessonSectionUsages(body).map((s) => s.key),
      lessonSections.map((s) => s.key),
      file,
    );
    assert.ok((body.match(/^### /gm) ?? []).length >= 3, file);
    assert.ok((body.match(/^\d+\. /gm) ?? []).length >= 2, file);
    assert.match(body, new RegExp(`mode="slice53-${Number(file.slice(0, 2))}"`));
    assert.doesNotMatch(body, /Đồng bộ từ checkpoint|TODO|TBD/);
    const blocks = [
      ...body.matchAll(
        /\{\/\* snippet ([^#]+)#([a-z0-9-]+) \*\/\}\s*```cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
      ),
    ];
    assert.equal(blocks.length, [...body.matchAll(/```cpp /g)].length, file);
    assert.ok(blocks.length >= 3, file);
    for (const [, relative, id, title, code] of blocks) {
      assert.equal(title.split(" — ")[0], relative);
      const base = relative.startsWith("tests/")
        ? project
        : path.join(project, "checkpoints", file.slice(0, 2));
      assert.equal(
        code.replace(/\r/g, ""),
        markedCodeExcerpt(readFileSync(path.join(base, relative), "utf8"), id),
        file + "#" + id,
      );
      count++;
    }
  }
  assert.equal(count, 40);
});
test("P53 snapshots resolve authoring stages and retain readable four-space C++", () => {
  for (const snapshot of [
    "starter",
    ...Array.from({ length: 9 }, (_, i) => "checkpoints/" + String(i + 1).padStart(2, "0")),
    "final",
  ]) {
    for (const file of files(path.join(project, snapshot))) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(source, /LAB_CHECKPOINT|if constexpr/, file);
      if (snapshot !== "final" || !/\.(cpp|hpp)$/.test(file)) continue;
      assert.doesNotMatch(source, /\t|\?[^\n]*:/, file);
      for (const line of source.split(/\r?\n/))
        assert.equal((line.match(/^ +(?=\S)/)?.[0].length ?? 0) % 4, 0, file);
      assert.ok((source.match(/\n\s*\n/g) ?? []).length >= 2, file);
    }
  }
});
test("P53 introduces storage, nearest, trilinear, mapping, context, picking, scan and audit at the taught stages", () => {
  for (const [stage, file, symbol] of [
    [1, "include/slice.hpp", "inline void renderFirstSlice"],
    [2, "include/volume.hpp", "class Volume"],
    [3, "include/sampling.hpp", "inline std::optional<double> sampleNearest"],
    [4, "include/sampling.hpp", "inline std::optional<double> sampleLinear"],
    [5, "include/display.hpp", "inline double windowValue"],
    [6, "include/context-mesh.hpp", "inline Mesh buildContextMesh"],
    [7, "include/layout.hpp", "inline std::optional<Vec3> pickSlice"],
    [8, "include/state.hpp", "void advance("],
    [9, "include/analysis.hpp", "inline Audit audit("],
  ]) {
    const current = readFileSync(
      path.join(project, "checkpoints", String(stage).padStart(2, "0"), file),
      "utf8",
    );
    const before = readFileSync(
      path.join(
        project,
        stage === 1 ? "starter" : "checkpoints/" + String(stage - 1).padStart(2, "0"),
        file,
      ),
      "utf8",
    );
    assert.ok(current.includes(symbol), file);
    assert.ok(!before.includes(symbol), file + " leaked into earlier stage");
  }
});
test("P53 actual data, display, native lifetime and async browser jobs have explicit boundaries", () => {
  const read = (name) => readFileSync(path.join(project, "final", name), "utf8");
  assert.match(read("include/state.hpp"), /side = 128/);
  assert.match(read("include/volume.hpp"), /std::vector<float>/);
  assert.match(read("include/grid.hpp"), /160\.0 \/ side, 192\.0 \/ side, 224\.0 \/ side/);
  assert.match(read("include/platform.hpp"), /SDL_LockTexture/);
  assert.match(read("include/platform.hpp"), /row \* pitch/);
  assert.match(read("src/main.cpp"), /state\.colorDirty\[view\]/);
  assert.match(read("src/main.cpp"), /frames > 600|options\.frames > 600/);
  assert.match(read("src/main.cpp"), /options\.seconds > 60/);
  assert.match(read("include/context-mesh.hpp"), /maxContextTriangles = 240000/);
  assert.doesNotMatch(read("include/context-mesh.hpp"), /fieldValue|sphereField/);
  const harness = readFileSync(path.join(project, "tests/tests.cpp"), "utf8");
  assert.doesNotMatch(harness, /#include\s*<cassert>|\bassert\(/);
  assert.match(harness, /failures != 0.*EXIT_FAILURE/);
  const dataset = readFileSync("lib/labs/volume-slicer/dataset.ts", "utf8");
  assert.match(dataset, /signal\.throwIfAborted/);
  assert.match(dataset, /performance\.now\(\) \+ 20000/);
  assert.match(dataset, /yieldTask\(signal\)/);
  assert.match(
    readFileSync("components/labs/volume-slicer/use-dataset.ts", "utf8"),
    /controller\.abort\(\)/,
  );
  assert.match(readFileSync("course/projects/p53/manifest.ts", "utf8"), /1e−10/);
});
