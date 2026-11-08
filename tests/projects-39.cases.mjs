import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import remarkMath from "remark-math";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { findLessonSection } from "../lib/lesson-sections.mjs";
import { migrateProgressContent } from "../lib/progress-content.ts";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(workspace, "examples/project-39-million-object-city");
const read = (relative) => readFile(path.join(workspace, relative), "utf8");

test("Project 39 publishes the million-object city and invalidates only retired workbench progress", async () => {
  const catalog = JSON.parse(await read("course/projects.json"));
  const entry = catalog.find((project) => project.id === "39");
  assert.equal(entry.slug, "million-object-city");
  assert.equal(entry.sourceDirectory, "project-39-million-object-city");
  assert.equal(entry.checkpointCount, 12);
  assert.equal(entry.demoId, "million-object-city");
  assert.equal(entry.shaderRuntimePerTarget, true);
  assert.equal(entry.contentRevision, 2);
  const old = {
    completedLessonIds: ["p38-l12", "p39-l01", "p39-l10", "p40-l01"],
    lastLessonId: "p39-l10",
    lastLesson: {
      id: "p39-l10",
      title: "Retired reduction workbench",
      href: "/projects/gpu-reduction-prefix-sum/10-hoan-thien-reduction-scan-workbench",
    },
  };
  const migrated = migrateProgressContent(old, { p39: entry.contentRevision });
  assert.deepEqual(migrated.completedLessonIds, ["p38-l12", "p40-l01"]);
  assert.equal(migrated.lastLesson, undefined);
  const current = { ...migrated, completedLessonIds: [...migrated.completedLessonIds, "p39-l01"] };
  assert.deepEqual(migrateProgressContent(current, { p39: 2 }), current);
});

test("all city lessons compile, keep seven teaching roles and quote their actual checkpoint", async () => {
  const directory = path.join(workspace, "content/million-object-city");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(files.length, 12);
  for (const [index, file] of files.entries()) {
    const source = await readFile(path.join(directory, file), "utf8");
    await compile(source, { remarkPlugins: [remarkMath] });
    assert.ok(Buffer.byteLength(source) <= 32 * 1024, file + " exceeds lesson budget");
    const roles = [...source.matchAll(/^## (.+)$/gm)]
      .map((match) => findLessonSection(match[1])?.key)
      .filter(Boolean);
    assert.deepEqual(
      roles,
      ["problem", "model", "code", "assembly", "experiments", "validation", "extensions"],
      file,
    );
    assert.ok(
      [...source.matchAll(/^### \d+\./gm)].length >= 3,
      file + " needs explained construction steps",
    );
    const blocks = [...source.matchAll(/```(cpp|glsl) title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g)];
    assert.ok(blocks.length >= 3, file + " needs at least three source excerpts");
    for (const [, language, title, fragment] of blocks) {
      const relative = title.split(" — ")[0];
      assert.match(
        relative,
        language === "cpp"
          ? /^(include|src|tests)\/.+\.(hpp|cpp)$/
          : /^shaders\/.+\.(comp|vert|frag)$/,
      );
      const base = relative.startsWith("tests/")
        ? root
        : path.join(root, "checkpoints", String(index + 1).padStart(2, "0"));
      const canonical = await readFile(path.join(base, relative), "utf8");
      assert.ok(isContiguousCodeExcerpt(fragment, canonical), file + " drifts from " + relative);
    }
    assert.match(
      source,
      /<InteractiveLab demo="million-object-city" mode="(?:city|frustum|reduction|scan|compaction|indirect)"\s*\/>/,
    );
  }
});

test("city GPU graph uses exact integer membership, hierarchical scan and command visibility", async () => {
  const prefix = "examples/project-39-million-object-city/source-template/";
  const types = await read(prefix + "include/city_types.hpp");
  const compute = await read(prefix + "include/city_compute.hpp");
  const cull = await read(prefix + "shaders/cull.comp");
  const scan = await read(prefix + "shaders/scan.comp");
  const add = await read(prefix + "shaders/uniform_add.comp");
  const compact = await read(prefix + "shaders/compact.comp");
  const commands = await read(prefix + "shaders/commands.comp");
  const vertex = await read(prefix + "shaders/city.vert");
  assert.match(types, /sizeof\(Object\) == 48/);
  assert.match(types, /sizeof\(IndirectCommand\) == 20/);
  assert.match(types, /std::uint32_t id/);
  assert.match(cull, /if \(index < uCount\)[\s\S]*Object object = objects\[index\]/);
  assert.match(cull, /mask\[object\.mesh\] = 1u/);
  assert.match(scan, /shared uvec4 temporary\[512\]/);
  assert.match(scan, /temporary\[511\] = uvec4\(0u\)/);
  assert.match(add, /blockOffsets\[index \/ 512u\]/);
  assert.match(compact, /groupBase \+ prefixes\[index\]\[group\]/);
  assert.match(compact, /visibleIDs\[destination\] = index/);
  assert.match(commands, /commands\[group\]\.instanceCount = counts\[group\]/);
  assert.match(commands, /commands\[group\]\.firstIndex = firstIndices\[group\]/);
  assert.match(compute, /GL_COMMAND_BARRIER_BIT \| GL_SHADER_STORAGE_BARRIER_BIT/);
  assert.match(
    compute,
    /for \(std::size_t index = buffers_\.scan\.size\(\) - 1; index > 0; --index\)/,
  );
  assert.match(vertex, /visibleIDs\[offset \+ uint\(gl_InstanceID\)\]/);
  assert.doesNotMatch(vertex, /gl_BaseInstance\b/);
});

test("city verification covers independent geometry, arbitrary integer primitives and stale empty commands", async () => {
  const prefix = "examples/project-39-million-object-city/source-template/include/";
  const fixtures = await read(prefix + "city_gpu_validation.hpp");
  const validation = await read(prefix + "city_validation.hpp");
  const runtimeValidation = await read(prefix + "city_validation_job.hpp");
  const app = await read(prefix + "city_application.hpp");
  const scene = await read(prefix + "city_scene.hpp");
  const timing = await read(prefix + "city_timing.hpp");
  assert.match(fixtures, /Independent scalar double classifier/);
  assert.match(fixtures, /262145/);
  assert.match(fixtures, /dispatchScanFixture/);
  assert.match(fixtures, /dispatchIntegerFixture/);
  assert.match(fixtures, /guardRecordsIntact/);
  assert.match(fixtures, /all-visible -> mixed -> empty/);
  assert.match(validation, /SCALE PASS/);
  assert.match(validation, /snapshot\.stats\.tested != objects_\.size\(\)/);
  assert.match(validation, /reference != candidate/);
  assert.match(runtimeValidation, /objects_\.resize\(257\)/);
  assert.match(runtimeValidation, /kBatchCount = 12/);
  assert.match(runtimeValidation, /deadline_ = SDL_GetTicks\(\) \+ 10000/);
  assert.match(runtimeValidation, /Validation cancelled/);
  assert.match(scene, /objects\.size\(\) \+ 8192U/);
  assert.match(scene, /512ULL \* 1024ULL \* 1024ULL/);
  assert.match(app, /1'000'003U/);
  assert.match(app, /objects_\.swap\(builder_\.objects\)/);
  assert.match(timing, /GL_QUERY_RESULT_AVAILABLE/);
  assert.match(timing, /samples\.size\(\) < 9U/);
  assert.match(timing, /warmup < 2U/);
  assert.match(timing, /MAD=/);
  assert.ok(
    app.indexOf("pumpEvents();") < app.indexOf("width_ <= 0"),
    "Quit must work before zero-size skip",
  );
});

test("city course explains the product and delivers complete build commands without fake benchmark claims", async () => {
  const first = await read("content/million-object-city/01-khu-pho-dau-tien.mdx");
  const records = await read("content/million-object-city/02-mot-trieu-object-tu-seed.mdx");
  const measurement = await read("content/million-object-city/11-kiem-chung-va-do-hieu-nang.mdx");
  const last = await read("content/million-object-city/12-thanh-pho-hoan-chinh.mdx");
  const learning = await read("course/projects/p39/learning.ts");
  const lab = await read("course/projects/p39/lab.ts");
  const glossary = await read("lib/glossary-million-object-city.ts");
  assert.match(first, /appendBox/);
  assert.match(first, /aPosition \* object\.halfSize/);
  assert.match(first, /identity/);
  assert.match(records, /checkpoint_2\.exe --count 257/);
  assert.ok(records.indexOf("preset 1") < records.indexOf("preset 2"));
  assert.ok(records.indexOf("preset 2") < records.indexOf("preset 3"));
  assert.match(measurement, /12 fixture camera\/toggle nhỏ đã qua/);
  assert.match(measurement, /medianCpuSubmitFrameMs/);
  assert.match(measurement, /medianWholeFrameMs/);
  assert.match(measurement, /medianFrameToGpuReadyMs/);
  assert.match(last, /ctest --test-dir build -C Debug/);
  assert.match(last, /ctest --test-dir build -C Release/);
  assert.match(last, /--verify --count 1000003/);
  assert.match(last, /--benchmark --count 1000003/);
  assert.match(last, /resident/);
  assert.match(last, /tested/);
  assert.match(last, /submitted/);
  assert.match(last, /không tạo số đo GPU giả/);
  assert.match(last, /project-39-million-object-city\.zip/);
  for (const source of [first, last, learning, lab]) {
    assert.doesNotMatch(source, /TODO|FIXME|Checkpoint đang xây/);
  }
  assert.match(glossary, /city-frustum-culling/);
  assert.match(glossary, /city-stable-compaction/);
  for (const file of ["manifest.ts", "learning.ts", "lab.ts"]) {
    assert.ok((await stat(path.join(workspace, "course/projects/p39", file))).size <= 20 * 1024);
  }
});
