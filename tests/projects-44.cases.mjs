import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import project from "../course/projects/p44/manifest.ts";
import lab from "../course/projects/p44/lab.ts";
import learning from "../course/projects/p44/learning.ts";
import { roadmapRevisions } from "../course/roadmap-revisions.ts";
import { volumeSculptorGlossaryTerms } from "../lib/glossary-volume-sculptor.ts";
import { lessonSections } from "../lib/lesson-sections.mjs";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { migrateProgressContent } from "../lib/progress-content.ts";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { interactiveLabUsages, lessonSectionUsages } from "../scripts/mdx-contracts.mjs";
import { projectCatalog, render, workspace, walkFiles } from "./site-support.mjs";

const slug = "volume-sculptor",
  directory = "project-44-volume-sculptor";
const source = path.join(workspace, "examples", directory),
  content = path.join(workspace, "content", slug);
const modes = [
  "tetra",
  "cells",
  "normals",
  "brush",
  "stroke",
  "field",
  "prefix",
  "mesh",
  "dirty",
  "slice",
  "archive",
  "validation",
];
const cppCounts = [5, 7, 4, 5, 10, 9, 9, 10, 14, 13, 16, 10];
const glslCounts = [0, 0, 0, 0, 0, 3, 6, 5, 0, 2, 0, 0];
const checkpoint = (order, file) =>
  readFile(
    path.join(
      source,
      order === 0 ? "starter" : `checkpoints/${String(order).padStart(2, "0")}`,
      file,
    ),
    "utf8",
  );
const lessonText = (lesson) => readFile(path.join(content, lesson.slug + ".mdx"), "utf8");

test("Project 44 catalog replaces the neighbor-list edition without reusing its learning progress", () => {
  assert.deepEqual(
    projectCatalog.find((entry) => entry.id === "44"),
    {
      id: "44",
      slug,
      sourceDirectory: directory,
      checkpointCount: 12,
      demoId: slug,
      contentRevision: 2,
      shaderRuntimePerTarget: true,
    },
  );
  assert.equal(roadmapRevisions["44"].replacement.slug, slug);
  assert.equal(roadmapRevisions["44"].previousSlug, "neighbor-list-skin");
  assert.equal(project.lessons.length, 12);
  const result = migrateProgressContent(
    {
      completedLessonIds: ["p43-l09", "p44-l01", "p44-l09", "p45-l02"],
      lastLessonId: "p44-l09",
      lastLesson: { id: "p44-l09", title: "old", href: "/projects/neighbor-list-skin/old" },
      projectContentVersions: { p43: 2 },
    },
    { p44: 2 },
  );
  assert.deepEqual(result.completedLessonIds, ["p43-l09", "p45-l02"]);
  assert.equal(result.lastLesson, undefined);
  assert.equal(result.lastLessonId, undefined);
  assert.equal(result.projectContentVersions.p44, 2);
  assert.equal(result.projectContentVersions.p43, 2);
  const current = migrateProgressContent(
    { completedLessonIds: ["p44-l01"], projectContentVersions: { p44: 2 } },
    { p44: 2 },
  );
  assert.deepEqual(current.completedLessonIds, ["p44-l01"]);
  for (const key of ["mission", "outcome"]) assert.ok(project.challenge[key].length > 80);
  assert.match(project.challenge.outcome, /128³/);
  assert.match(project.challenge.outcome, /127³/);
  assert.match(project.challenge.requirements.join(" "), /Khoét.*lỗ/);
  assert.match(project.challenge.constraints.join(" "), /Count.*allocate\/emit/);
  assert.match(project.challenge.definitionOfDone.join(" "), /chuột|Chuột/);
});

test("Project 44 lessons connect all twelve Canvas questions, teaching roles and exact source checkpoints", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.deepEqual(
    files,
    project.lessons.map((lesson) => lesson.slug + ".mdx"),
  );
  assert.deepEqual(Object.keys(lab.modes), modes);
  let cpp = 0,
    glsl = 0;
  for (const [index, lesson] of project.lessons.entries()) {
    assert.equal(lesson.id, `p44-l${String(index + 1).padStart(2, "0")}`);
    assert.equal(lesson.order, index + 1);
    const text = await lessonText(lesson);
    assert.ok(Buffer.byteLength(text) <= 32768, lesson.slug);
    assert.doesNotMatch(text, /Bản biên tập|chưa (?:phát hành|ghép Canvas|đăng ký)/);
    const sections = lessonSectionUsages(text);
    const roles = sections.map((section) => section.key);
    assert.deepEqual(
      [...new Set(roles)],
      lessonSections.map((section) => section.key),
    );
    assert.equal(roles.length, 7);
    const usages = interactiveLabUsages(text, lesson.slug);
    assert.equal(usages.length, 1);
    assert.equal(usages[0].demo, slug);
    assert.equal(usages[0].mode, modes[index]);
    const byRole = Object.fromEntries(sections.map((section) => [section.key, section]));
    const labOffset = text.indexOf("<InteractiveLab ");
    assert.ok(byRole.model.end < labOffset && labOffset < byRole.code.start, lesson.slug);
    const experiments = text.slice(byRole.experiments.end, byRole.validation.start);
    assert.ok((experiments.match(/^\d+\. /gm) ?? []).length >= 2, lesson.slug);
    const time = text
      .match(/^Thời gian gợi ý:.+$/m)?.[0]
      .match(/\d+/g)
      .map(Number);
    assert.equal(
      time?.reduce((sum, value) => sum + value, 0),
      lesson.estimatedMinutes,
      lesson.slug + " study time",
    );
    const blocks = [...text.matchAll(/```(cpp|glsl) title="([^"\n]+)"\r?\n([\s\S]*?)```/g)];
    assert.equal(blocks.filter((block) => block[1] === "cpp").length, cppCounts[index]);
    assert.equal(blocks.filter((block) => block[1] === "glsl").length, glslCounts[index]);
    for (const [, language, title, excerpt] of blocks) {
      const file = title.split(" — ")[0];
      assert.ok(
        isContiguousCodeExcerpt(excerpt, await checkpoint(index + 1, file)),
        lesson.slug + ": " + title,
      );
      if (language === "cpp") ++cpp;
      else ++glsl;
    }
  }
  assert.equal(cpp, 112);
  assert.equal(glsl, 16);
});

test("Project 44 source snapshots have real teaching boundaries and final matches checkpoint twelve", async () => {
  assert.match(await checkpoint(0, "src/main.cpp"), /runTetraPreview/);
  assert.doesNotMatch(
    await checkpoint(0, "include/sculpt_topology.hpp"),
    /inline EdgePoint edgePoint\(/,
  );
  assert.match(await checkpoint(1, "include/sculpt_topology.hpp"), /inline EdgePoint edgePoint\(/);
  for (const order of [2, 3, 4, 5])
    assert.match(await checkpoint(order, "src/main.cpp"), /runCpuPreview/);
  assert.doesNotMatch(
    await checkpoint(3, "include/sculpt_brush.hpp"),
    /inline SampleBox applyBrush\(/,
  );
  assert.match(await checkpoint(4, "include/sculpt_brush.hpp"), /inline SampleBox applyBrush\(/);
  for (const order of [6, 7])
    assert.match(await checkpoint(order, "src/main.cpp"), /runGpuFieldPreview/);
  for (const order of [8, 9])
    assert.match(await checkpoint(order, "src/main.cpp"), /runGpuSurfacePreview/);
  assert.doesNotMatch(await checkpoint(10, "src/main.cpp"), /sculpt_file_tasks\.hpp|files\.tick\(/);
  assert.match(await checkpoint(11, "src/main.cpp"), /files\.tick\(/);
  assert.doesNotMatch(await checkpoint(11, "src/main.cpp"), /runSculptBenchmark/);
  assert.match(await checkpoint(12, "src/main.cpp"), /runSculptBenchmark/);
  for (const order of Array.from({ length: 13 }, (_, index) => index))
    assert.doesNotMatch(await checkpoint(order, "src/main.cpp"), /^\s*#.*LAB_CHECKPOINT/m);
  const finalFiles = await walkFiles(path.join(source, "final"));
  for (const file of finalFiles) {
    const relative = path.relative(path.join(source, "final"), file);
    const actual = await readFile(file),
      expected = await readFile(path.join(source, "checkpoints/12", relative));
    assert.deepEqual(actual, expected, "final mismatch: " + relative);
  }
  assert.ok(finalFiles.length > 60, "native product is multi-file, not just a snippet");
  const cmake = await readFile(path.join(source, "CMakeLists.txt"), "utf8");
  assert.match(cmake, /set\(PROJECT_CHECKPOINT_COUNT 12\)/);
  assert.match(cmake, /SDL3::SDL3/);
  assert.match(cmake, /SDL3 3\.4\.8 EXACT/);
  assert.match(cmake, /shaders\/\$\{name\}/);
});

test("Project 44 references, glossary and code guides belong to the volume product", async () => {
  const ids = new Set(volumeSculptorGlossaryTerms.map((term) => term.id));
  assert.equal(ids.size, 12);
  assert.deepEqual(
    Object.keys(learning.guides),
    project.lessons.map((lesson) => lesson.id),
  );
  assert.deepEqual(
    Object.keys(learning.references),
    project.lessons.map((lesson) => lesson.id),
  );
  for (const lesson of project.lessons) {
    const guide = learning.guides[lesson.id];
    assert.ok(guide.steps.length >= 3);
    assert.ok(guide.expected.length > 30);
    for (const file of guide.files) {
      const target = file.startsWith("tests/")
        ? path.join(source, file)
        : path.join(source, "source-template", file);
      assert.ok((await stat(target)).isFile(), lesson.id + " " + file);
    }
    for (const reference of learning.references[lesson.id])
      if (reference.kind === "Thuật ngữ") assert.ok(ids.has(reference.href.split("#")[1]));
  }
  const final = await lessonText(project.lessons[11]);
  assert.match(final, /\/downloads\/project-44-volume-sculptor\.zip/);
  assert.match(final, /Mã chạy được sau bài/);
  assert.match(final, /warm-up/);
  assert.match(final, /median/);
  assert.match(final, /MAD/);
  assert.match(final, /\/roadmap\/45/);
});

test("Project 44 teaching C++ keeps four-space indentation, explanatory comments and logical blocks", async () => {
  const assertIndentation = (value, label) => {
    assert.doesNotMatch(value, /\t/, label);
    for (const [index, line] of value.split(/\r?\n/).entries()) {
      const spaces = line.match(/^ +(?=\S)/)?.[0].length ?? 0;
      assert.equal(spaces % 4, 0, `${label}:${index + 1} has ${spaces} spaces`);
    }
  };
  const files = [
    ...(await walkFiles(path.join(source, "source-template"))),
    ...(await walkFiles(path.join(source, "tests"))),
  ].filter((file) => /\.(?:cpp|hpp)$/.test(file));
  assert.ok(files.length >= 70);
  for (const file of files) {
    const value = await readFile(file, "utf8");
    assertIndentation(value, path.relative(source, file));
    assert.match(value, /^\s*\/\/ /m, file);
    assert.ok((value.match(/\r?\n\s*\r?\n/g) ?? []).length >= 2, file);
  }
  for (const lesson of project.lessons)
    for (const [, code] of (await lessonText(lesson)).matchAll(
      /```cpp[^\r\n]*\r?\n([\s\S]*?)\r?\n```/g,
    ))
      assertIndentation(code, lesson.slug);
  const runner = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  assert.doesNotMatch(runner, /#include\s*<cassert>|\bassert\s*\(/);
  assert.match(runner, /void check\(bool condition, std::string_view message\)/);
  assert.match(runner, /if \(!condition\)\s*throw std::runtime_error\(std::string\(message\)\)/);
  assert.match(runner, /if \(failures != 0\)\s*return EXIT_FAILURE;/);
  assert.match(runner, /return EXIT_SUCCESS;/);
});

test("Project 44 real MDX compiler retains One Dark, formulas and the lazy Canvas import", async () => {
  for (const lesson of project.lessons) {
    const compiled = String(
      await compile(
        { value: await lessonText(lesson), path: path.join(content, lesson.slug + ".mdx") },
        courseMdxOptions,
      ),
    );
    assert.match(compiled, /CourseStaticMarkup/);
    assert.match(compiled, /one-dark-pro/);
    assert.ok(new Set(compiled.match(/#[0-9a-f]{6}/gi)).size >= 5, lesson.slug);
    assert.match(compiled, /katex-mathml/);
    assert.match(compiled, /application\/x-tex/);
    assert.match(compiled, /InteractiveLab/);
    assert.doesNotMatch(compiled, /katex-error/);
  }
});

test("Project 44 rendered overview exposes challenge, twelve lessons and the correct ZIP", async () => {
  const response = await render(`/projects/${slug}`);
  assert.equal(response.status, 200);
  const html = (await response.text()).replaceAll("<!-- -->", "");
  assert.match(html, /id="challenge-44"/);
  assert.match(html, /VOLUME SCULPTOR/);
  assert.ok(html.includes('href="/downloads/' + directory + '.zip"'));
  for (const lesson of project.lessons)
    assert.ok(html.includes(`/projects/${slug}/${lesson.slug}`));
  assert.doesNotMatch(html, /NEIGHBOR LIST LAB|Danh sách hàng xóm có vùng đệm/);
});

test("Project 44 rendered client chunks separate the tetra from the editor within the existing budget", async () => {
  const directory = path.join(workspace, "dist/client/_next/static/chunks");
  const entries = await readdir(directory);
  for (const prefix of ["volume-sculptor-lab-", "volume-workshop-", "tetra-lab-"]) {
    const file = entries.find((name) => name.startsWith(prefix) && name.endsWith(".js"));
    assert.ok(file, "Missing actual production split point: " + prefix);
    const bytes = (await stat(path.join(directory, file))).size;
    assert.ok(bytes < 24 * 1024, `${file} has ${bytes} bytes`);
  }
  const entry = await readFile(
    path.join(workspace, "components/labs/volume-sculptor-lab.tsx"),
    "utf8",
  );
  assert.match(entry, /lazy\(\(\)\s*=>\s*import\("\.\/volume-sculptor\/tetra-lab"\)/);
  assert.match(entry, /lazy\(\(\)\s*=>\s*import\("\.\/volume-sculptor\/volume-workshop"\)/);
});

test("Project 44 rendered lesson routes retain readable code and complete source access", async () => {
  for (const lesson of project.lessons) {
    const route = `/projects/${slug}/${lesson.slug}`,
      response = await render(route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert.ok(Buffer.byteLength(html) < 350 * 1024, route);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(html, /katex-error/);
  }
});

test("Project 44 rendered retired URLs redirect to the new overview, not a mismatched lesson", async () => {
  for (const route of [
    "/roadmap/44",
    "/projects/neighbor-list-skin",
    "/projects/neighbor-list-skin/01-ve-he-hat-va-vung-tuong-tac",
  ]) {
    const response = await render(route);
    assert.ok(response.status >= 300 && response.status < 400, route);
    assert.ok(response.headers.get("location")?.endsWith(`/projects/${slug}`), route);
  }
});
