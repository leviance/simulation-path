import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import project from "../course/projects/p42/manifest.ts";
import lab from "../course/projects/p42/lab.ts";
import learning from "../course/projects/p42/learning.ts";
import { particleMorphGlossaryTerms } from "../lib/glossary-particle-morph.ts";
import { lessonSections } from "../lib/lesson-sections.mjs";
import { migrateProgressContent } from "../lib/progress-content.ts";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { interactiveLabUsages, lessonSectionUsages } from "../scripts/mdx-contracts.mjs";
import { projectCatalog, render, workspace } from "./site-support.mjs";

const slug = "particle-morph-studio";
const directory = "project-42-particle-morph-studio";
const overview = "/projects/" + slug;
const zip = "/downloads/" + directory + ".zip";
const source = path.join(workspace, "examples", directory);
const content = path.join(workspace, "content", slug);
const modes = Object.keys(lab.modes);
const snapshot = (order, file) =>
  readFile(
    path.join(
      source,
      order === 0 ? "starter" : "checkpoints/" + String(order).padStart(2, "0"),
      file,
    ),
    "utf8",
  );

test("Project 42 replaces only its old content and progress", () => {
  const entry = projectCatalog.find(({ id }) => id === "42");
  assert.deepEqual(entry, {
    id: "42",
    slug,
    sourceDirectory: directory,
    checkpointCount: 10,
    demoId: slug,
    contentRevision: 2,
    shaderRuntimePerTarget: true,
  });
  const old = {
    completedLessonIds: ["p41-l09", "p42-l01", "p42-l08", "p43-l01"],
    lastLessonId: "p42-l08",
    lastLesson: { id: "p42-l08", href: "/projects/molecular-dynamics-cpu/08-old", title: "MD" },
    projectContentVersions: { p41: 2 },
  };
  const migrated = migrateProgressContent(old, { p42: 2 });
  assert.deepEqual(migrated.completedLessonIds, ["p41-l09", "p43-l01"]);
  assert.equal(migrated.lastLesson, undefined);
  assert.equal(migrated.lastLessonId, undefined);
  const learned = { ...migrated, completedLessonIds: [...migrated.completedLessonIds, "p42-l01"] };
  assert.deepEqual(migrateProgressContent(learned, { p42: 2 }), learned);
});

test("all ten Project 42 lessons teach exact C++/GLSL from their checkpoint", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.deepEqual(
    files,
    project.lessons.map(({ slug }) => slug + ".mdx"),
  );
  assert.equal(files.length, 10);
  assert.equal(modes.length, 10);
  const terms = new Set(particleMorphGlossaryTerms.map(({ id }) => id));
  assert.equal(terms.size, particleMorphGlossaryTerms.length);
  let snippets = 0;
  for (const [index, file] of files.entries()) {
    const text = await readFile(path.join(content, file), "utf8");
    const lesson = project.lessons[index];
    assert.equal(lesson.order, index + 1);
    assert.equal(lesson.id, "p42-l" + String(index + 1).padStart(2, "0"));
    assert.ok(Buffer.byteLength(text) < 32768);
    assert.deepEqual(
      lessonSectionUsages(text).map(({ key }) => key),
      lessonSections.map(({ key }) => key),
    );
    assert.deepEqual(interactiveLabUsages(text, file), [{ demo: slug, mode: modes[index] }]);
    const blocks = [...text.matchAll(/^```(?:cpp|glsl)([^\r\n]*)\r?\n([\s\S]*?)\r?\n```$/gm)];
    assert.ok(blocks.length >= 2, file);
    for (const [, title, code] of blocks) {
      const relative = /^\s+title="((?:include|src|shaders)\/[\w./-]+) — [^"]+"$/.exec(title)?.[1];
      assert.ok(relative, file + " needs a source-file title");
      assert.ok(
        isContiguousCodeExcerpt(code, await snapshot(index + 1, relative)),
        file + " drifts from " + relative,
      );
      snippets++;
    }
    for (const relative of learning.guides[lesson.id].files) {
      const value = relative.startsWith("tests/")
        ? await readFile(path.join(source, relative))
        : await snapshot(index + 1, relative);
      assert.ok(value.length > 0, relative);
    }
    for (const reference of learning.references[lesson.id])
      assert.ok(terms.has(reference.href.slice("/glossary#".length)), reference.href);
    const next = project.lessons[index + 1];
    if (next) assert.ok(text.includes("](" + overview + "/" + next.slug + ")"));
  }
  assert.equal(snippets, 34);
});

test("Project 42 adds sampling, matching, compute and batching at the taught stage", async () => {
  const features = [
    [2, "include/surface_sampler.hpp", /std::upper_bound/],
    [
      3,
      "include/morph_preparation.hpp",
      /output_->path\[cursor_\]\.w = static_cast<float>\(ratio\)/,
    ],
    [4, "include/morph_preparation.hpp", /std::swap\(output_->mapping/],
    [5, "include/morph_timeline.hpp", /3\.0 - 2\.0 \* t/],
    [6, "include/morph_app.hpp", /std::make_unique<GpuParticles>/],
    [7, "include/morph_app.hpp", /activeGpu_->update\(\*compute_/],
    [8, "include/morph_preparation.hpp", /if \(candidate_->advance\(\)\)/],
    [9, "include/morph_timing.hpp", /collect\(\);/],
    [10, "include/morph_settings.hpp", /maximumCount = 5000000/],
  ];
  for (const [order, file, pattern] of features) {
    assert.doesNotMatch(await snapshot(order - 1, file), pattern, "introduced early: " + file);
    assert.match(await snapshot(order, file), pattern, "not introduced at checkpoint " + order);
  }
});

test("Project 42 updates and draws actual N with finite readback and transactional buffers", async () => {
  const final = (file) => readFile(path.join(source, "final", file), "utf8");
  const compute = await final("shaders/morph_update.comp");
  assert.match(compute, /local_size_x = 256/);
  assert.match(compute, /if \(id >= particleCount\)/);
  assert.match(compute, /current\[id\]/);
  assert.match(await final("include/morph_gpu.hpp"), /SHADER_STORAGE_BARRIER_BIT/);
  assert.match(await final("include/morph_renderer.hpp"), /gl_\.DrawArrays\(GL_POINTS, 0,/);
  const gpu = await final("include/morph_gpu.hpp");
  assert.match(gpu, /GL_BUFFER_SIZE/);
  assert.match(gpu, /readCurrent/);
  const verify = await final("include/morph_verify.hpp");
  assert.match(verify, /GPU MORPH PASS/);
  assert.match(verify, /320000|compared/);
  assert.match(verify, /chrono::seconds\(30\)/);
  const readme = await readFile(path.join(source, "README.md"), "utf8");
  assert.match(readme, /1\.000\.003|1,000,003|1000003/);
  assert.match(readme, /5\.000\.000|5,000,000|5000000/);
  assert.match(readme, /không.*optimal transport/i);
});

test("the first three Project 42 checkpoints finish without a shuffle cursor", async () => {
  for (const order of [1, 2, 3]) {
    const text = await snapshot(order, "include/morph_preparation.hpp");
    const phase = text.match(/else if \(phase_ == 2\) \{([\s\S]*?)\n\s*\}/)?.[1];
    assert.ok(phase, "missing identity-pair completion at checkpoint " + order);
    assert.match(phase, /finished_ = true;/);
    assert.doesNotMatch(phase, /if\s*\(cursor_/);
  }
});

test("Project 42 roadmap and overview advertise the actual ten-lesson product", async () => {
  const response = await render(overview);
  assert.equal(response.status, 200);
  const html = (await response.text()).replaceAll("<!-- -->", "");
  assert.match(html, /id="challenge-42"/);
  assert.ok(html.includes('href="' + zip + '"'));
  for (const { slug: lesson } of project.lessons)
    assert.ok(html.includes('href="' + overview + "/" + lesson + '"'));
  const redirect = await render("/roadmap/42");
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get("location"), overview);
});

test("every Project 42 lesson renders the right Canvas, source, code colors and navigation", async () => {
  for (const [index, lesson] of project.lessons.entries()) {
    const result = await render(overview + "/" + lesson.slug);
    assert.equal(result.status, 200);
    const html = (await result.text()).replaceAll("<!-- -->", "");
    assert.ok(html.includes('data-particle-morph-mode="' + modes[index] + '"'), lesson.slug);
    assert.match(html, /aria-label="Canvas Project 42: biến hình hạt"/);
    assert.match(html, /checkpoint-source/);
    assert.match(html, /highlighted-code|shiki/);
    assert.match(html, /id="thử-làm-sai-để-hiểu-đúng"/);
    const next = project.lessons[index + 1];
    if (next) assert.ok(html.includes('href="' + overview + "/" + next.slug + '"'));
    else assert.ok(html.includes('href="' + zip + '"'));
  }
});
