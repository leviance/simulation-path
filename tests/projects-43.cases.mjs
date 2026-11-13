import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import project from "../course/projects/p43/manifest.ts";
import lab from "../course/projects/p43/lab.ts";
import learning from "../course/projects/p43/learning.ts";
import { mandelbulbGlossaryTerms } from "../lib/glossary-mandelbulb.ts";
import { lessonSections } from "../lib/lesson-sections.mjs";
import { migrateProgressContent } from "../lib/progress-content.ts";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { interactiveLabUsages, lessonSectionUsages } from "../scripts/mdx-contracts.mjs";
import { projectCatalog, render, workspace } from "./site-support.mjs";
const slug = "mandelbulb-explorer",
  directory = "project-43-mandelbulb-explorer";
const source = path.join(workspace, "examples", directory),
  content = path.join(workspace, "content", slug);
const overview = "/projects/" + slug,
  zip = "/downloads/" + directory + ".zip";
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

test("Project 43 replaces periodic MD without migrating unrelated learning progress", () => {
  assert.deepEqual(
    projectCatalog.find((entry) => entry.id === "43"),
    {
      id: "43",
      slug,
      sourceDirectory: directory,
      checkpointCount: 9,
      demoId: slug,
      contentRevision: 2,
      shaderRuntimePerTarget: true,
    },
  );
  const old = {
    completedLessonIds: ["p42-l01", "p43-l01", "p43-l08", "p44-l01"],
    lastLessonId: "p43-l08",
    lastLesson: { id: "p43-l08", href: "/projects/periodic-molecular-box/08-old", title: "old" },
    projectContentVersions: { p42: 2 },
  };
  const migrated = migrateProgressContent(old, { p43: 2 });
  assert.deepEqual(migrated.completedLessonIds, ["p42-l01", "p44-l01"]);
  assert.equal(migrated.lastLessonId, undefined);
  assert.equal(migrated.lastLesson, undefined);
  const current = { ...migrated, completedLessonIds: [...migrated.completedLessonIds, "p43-l01"] };
  assert.deepEqual(migrateProgressContent(current, { p43: 2 }), current);
});
test("all nine Mandelbulb lessons teach contiguous real C++/GLSL from the exact checkpoint", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.deepEqual(
    files,
    project.lessons.map((lesson) => lesson.slug + ".mdx"),
  );
  assert.equal(files.length, 9);
  assert.equal(modes.length, 9);
  const terms = new Set(mandelbulbGlossaryTerms.map((term) => term.id));
  assert.equal(terms.size, 9);
  let blocks = 0;
  for (const [index, file] of files.entries()) {
    const text = await readFile(path.join(content, file), "utf8"),
      lesson = project.lessons[index];
    assert.equal(lesson.id, "p43-l" + String(index + 1).padStart(2, "0"));
    assert.equal(lesson.order, index + 1);
    assert.ok(Buffer.byteLength(text) < 32768);
    assert.deepEqual(
      lessonSectionUsages(text).map((section) => section.key),
      lessonSections.map((section) => section.key),
    );
    assert.deepEqual(interactiveLabUsages(text, file), [{ demo: slug, mode: modes[index] }]);
    const snippets = [...text.matchAll(/^```(?:cpp|glsl)([^\r\n]*)\r?\n([\s\S]*?)\r?\n```$/gm)];
    assert.ok(snippets.length >= 2, file);
    for (const [, title, code] of snippets) {
      const relative = /^\s+title="((?:include|src|shaders)\/[\w./-]+) — [^"]+"$/.exec(title)?.[1];
      assert.ok(relative, title);
      assert.ok(
        isContiguousCodeExcerpt(code, await snapshot(index + 1, relative)),
        file + " drifts from " + relative,
      );
      blocks++;
    }
    for (const relative of learning.guides[lesson.id].files) {
      const value = relative.startsWith("tests/")
        ? await readFile(path.join(source, relative))
        : await snapshot(index + 1, relative);
      assert.ok(value.length, relative);
    }
    for (const reference of learning.references[lesson.id])
      assert.ok(terms.has(reference.href.slice("/glossary#".length)), reference.href);
    const next = project.lessons[index + 1];
    if (next) assert.ok(text.includes("](" + overview + "/" + next.slug + ")"));
  }
  assert.ok(blocks >= 27, "Detailed lessons must not collapse into loose helper sketches");
  const illustration = await readFile(
    path.join(workspace, "public/illustrations/project-43-mandelbulb.png"),
  );
  assert.deepEqual([...illustration.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(illustration.readUInt32BE(16), 960);
  assert.equal(illustration.readUInt32BE(20), 540);
  const shader = await snapshot(1, "shaders/bulb.comp");
  assert.match(shader, /snippet:bulb-gpu-power/);
  assert.match(shader, /end-snippet:bulb-gpu-power/);
});
test("Mandelbulb capabilities appear at the explained checkpoint, not secretly in starter", async () => {
  for (const [order, file, pattern] of [
    [1, "shaders/bulb.comp", /vec3 sphericalPower\(/],
    [2, "shaders/bulb.comp", /RayHit trace\(/],
    [3, "shaders/bulb.comp", /distance = 0\.5 \* log\(r\) \* r \/ dr/],
    [4, "shaders/bulb.comp", /vec3 normalAt\(/],
    [5, "include/bulb_app.hpp", /camera_\.orbit\(dx, dy\)/],
    [6, "include/bulb_gpu_probe.hpp", /class GpuFieldProbe/],
    [7, "include/bulb_jobs.hpp", /const int columns =/],
    [8, "shaders/bulb.comp", /float occlusion = 0\.0/],
    [9, "include/bulb_export.hpp", /inline void exportImage\(/],
  ]) {
    assert.doesNotMatch(await snapshot(order - 1, file), pattern, "introduced early: " + file);
    assert.match(await snapshot(order, file), pattern, "not introduced at " + order);
  }
});
test("native renderer uses full-size finite batches, honest generations and non-blocking GPU queries", async () => {
  const final = (file) => readFile(path.join(source, "final", file), "utf8");
  const settings = await final("include/bulb_settings.hpp"),
    gpu = await final("include/bulb_gpu.hpp"),
    shader = await final("shaders/bulb.comp");
  assert.match(settings, /imageWidth = 960/);
  assert.match(settings, /imageHeight = 540/);
  assert.match(settings, /maximumBatchWork = 4000000/);
  assert.match(settings, /fieldCalls \+= 16 \+ 4/);
  assert.match(shader, /iteration < 24/);
  assert.match(shader, /step < 256/);
  assert.match(gpu, /GL_BUFFER_SIZE/);
  assert.match(gpu, /GL_MAX_COMPUTE_WORK_GROUP_COUNT/);
  assert.match(gpu, /GL_QUERY_RESULT_AVAILABLE/);
  assert.match(gpu, /chrono::seconds\(3\)/);
  assert.doesNotMatch(gpu, /\.Finish\(/);
  assert.match(gpu, /finalCount_ != imageWidth \* imageHeight/);
  assert.match(shader, /greaterThanEqual\(local, tileExtent\)/);
  assert.match(shader, /record\.work\.w != generation/);
  assert.match(await final("shaders/display.frag"), /candidate\.work\.w == generation/);
  assert.match(await final("include/bulb_verify.hpp"), /completeReadback=1/);
  assert.match(
    await final("include/bulb_verify.hpp"),
    /referenceRay\(snapshot\.camera\.eye\(\), ray, snapshot\.settings, 0\.0005\)/,
  );
  assert.doesNotMatch(
    await final("include/bulb_reference.hpp"),
    /\bacos\(|\batan2\(|\bevaluate\(|\bsphericalPower\(/,
  );
  assert.match(await final("include/bulb_gpu_probe.hpp"), /points\.size\(\) > 64/);
  assert.match(await final("include/bulb_gpu_probe.hpp"), /std::memcmp/);
  const readme = await readFile(path.join(source, "README.md"), "utf8");
  assert.match(readme, /25\.666\.752/);
  assert.match(readme, /không phải SDF chính xác/i);
  assert.match(readme, /0,006 world units/);
});
test("legacy periodic math stays available only for the old downstream MD labs", async () => {
  const math = await readFile(path.join(workspace, "lib/labs/periodic-molecular-box.ts"), "utf8");
  assert.match(math, /Legacy periodic Molecular Dynamics/);
  assert.match(
    await readFile(path.join(workspace, "lib/labs/neighbor-list-skin.ts"), "utf8"),
    /periodic-molecular-box/,
  );
  assert.match(
    await readFile(path.join(workspace, "lib/labs/molecular-lab-gpu.ts"), "utf8"),
    /periodic-molecular-box/,
  );
});
test("Mandelbulb overview and roadmap link the rebuilt nine-lesson product", async () => {
  const response = await render(overview);
  assert.equal(response.status, 200);
  const html = (await response.text()).replaceAll("<!-- -->", "");
  assert.match(html, /id="challenge-43"/);
  assert.doesNotMatch(html, /aria-label="Chờ nghiệm thu"/);
  assert.ok(html.includes('href="' + zip + '"'));
  for (const lesson of project.lessons)
    assert.ok(html.includes('href="' + overview + "/" + lesson.slug + '"'));
  const redirect = await render("/roadmap/43");
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get("location"), overview);
});
test("all nine Mandelbulb routes render the intended Canvas, source, One Dark and next links", async () => {
  for (const [index, lesson] of project.lessons.entries()) {
    const response = await render(overview + "/" + lesson.slug);
    assert.equal(response.status, 200);
    const html = (await response.text()).replaceAll("<!-- -->", "");
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, lesson.slug);
    assert.doesNotMatch(html, /aria-label="Chờ nghiệm thu"/);
    assert.ok(html.includes('data-mandelbulb-mode="' + modes[index] + '"'), lesson.slug);
    assert.match(html, /Canvas Project 43: Mandelbulb/);
    assert.match(html, /checkpoint-source/);
    assert.match(html, /one-dark-pro/);
    assert.match(html, /id="thử-làm-sai-để-hiểu-đúng"/);
    const next = project.lessons[index + 1];
    if (next) assert.ok(html.includes('href="' + overview + "/" + next.slug + '"'));
    else assert.ok(html.includes('href="' + zip + '"'));
  }
});
