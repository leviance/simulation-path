import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import project from "../course/projects/p41/manifest.ts";
import lab from "../course/projects/p41/lab.ts";
import { lessonSections } from "../lib/lesson-sections.mjs";
import { migrateProgressContent } from "../lib/progress-content.ts";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { interactiveLabUsages, lessonSectionUsages } from "../scripts/mdx-contracts.mjs";
import { projectCatalog, render, workspace } from "./site-support.mjs";

const slug = "geometry-workshop";
const overview = "/projects/" + slug;
const directory = "project-41-geometry-workshop";
const zip = "/downloads/" + directory + ".zip";
const source = path.join(workspace, "examples", directory);
const content = path.join(workspace, "content", slug);
const modes = Object.keys(lab.modes);

test("Project 41 uses its new catalog and keeps unrelated lesson progress", () => {
  const entry = projectCatalog.find(({ id }) => id === "41");
  assert.deepEqual(entry, {
    id: "41",
    slug,
    sourceDirectory: directory,
    checkpointCount: 9,
    demoId: slug,
    contentRevision: 2,
    shaderRuntimePerTarget: true,
  });
  const old = {
    completedLessonIds: ["p40-l14", "p41-l01", "p41-l07", "p42-l01"],
    lastLessonId: "p41-l07",
    lastLesson: {
      id: "p41-l07",
      title: "Lennard–Jones",
      href: "/projects/lennard-jones-pair/07-old",
    },
    projectContentVersions: { p40: 2 },
  };
  const versions = { p41: entry.contentRevision };
  const migrated = migrateProgressContent(old, versions);
  assert.deepEqual(migrated.completedLessonIds, ["p40-l14", "p42-l01"]);
  assert.equal(migrated.lastLessonId, undefined);
  assert.equal(migrated.lastLesson, undefined);
  const learned = { ...migrated, completedLessonIds: [...migrated.completedLessonIds, "p41-l01"] };
  assert.deepEqual(migrateProgressContent(learned, versions), learned);
});

test("Project 41 code and Canvas match all nine actual lesson snapshots", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.deepEqual(
    files,
    project.lessons.map((lesson) => lesson.slug + ".mdx"),
  );
  assert.equal(files.length, modes.length);
  for (const [index, file] of files.entries()) {
    const mdx = await readFile(path.join(content, file), "utf8");
    assert.deepEqual(
      lessonSectionUsages(mdx).map(({ key }) => key),
      lessonSections.map(({ key }) => key),
      file,
    );
    assert.deepEqual(interactiveLabUsages(mdx, file), [{ demo: slug, mode: modes[index] }]);
    const blocks = [...mdx.matchAll(/^```(?:cpp|glsl)([^\r\n]*)\r?\n([\s\S]*?)\r?\n```$/gm)];
    assert.ok(blocks.length >= 2, file + " should teach real checkpoint code");
    const checkpoint = file.slice(0, 2);
    for (const [, title, code] of blocks) {
      const relative = /^\s+title="((?:include|src|shaders)\/[\w./-]+) — [^"]+"$/.exec(title)?.[1];
      assert.ok(relative, file + " needs a source file in its block title");
      const actual = await readFile(path.join(source, "checkpoints", checkpoint, relative), "utf8");
      assert.ok(isContiguousCodeExcerpt(code, actual), file + " drifts from " + relative);
    }
  }
});

test("each Project 41 checkpoint adds the feature taught in that lesson", async () => {
  const features = [
    ["include/parametric_surfaces.hpp", /SurfaceSample samplePatch\(/],
    ["include/parametric_mesh.hpp", /void appendGridCell\(/],
    ["include/parametric_surfaces.hpp", /SurfaceSample sampleTorus\(/],
    ["shaders/surface.frag", /if \(!gl_FrontFacing\)/],
    ["include/sweep_frames.hpp", /CurveSample sampleShellCurve\(/],
    ["include/sweep_frames.hpp", /CurveSample sampleKnotCurve\(/],
    ["include/mesh_session.hpp", /SurfaceSettings previewSettings\(/],
    ["include/obj_file.hpp", /std::filesystem::path exportVerifiedObj\(/],
    ["include/surface_settings.hpp", /maxSegments = 256;/],
  ];
  const snapshot = (order) =>
    order === 0 ? "starter" : "checkpoints/" + String(order).padStart(2, "0");
  for (const [index, [file, feature]] of features.entries()) {
    const previous = await readFile(path.join(source, snapshot(index), file), "utf8");
    const current = await readFile(path.join(source, snapshot(index + 1), file), "utf8");
    assert.doesNotMatch(previous, feature, file + " introduces its feature too early");
    assert.match(current, feature, file + " is missing its feature");
  }
});

test("Project 41 is discoverable from the homepage, roadmap and current downloads", async () => {
  const roadmap = await (await render("/roadmap")).text();
  const card = roadmap.match(/<a\b[^>]*\bid="project-41"[^>]*>[\s\S]*?<\/a>/)?.[0];
  assert.ok(card, "Project 41 needs a clickable entry");
  assert.ok(card.includes('href="' + overview + '"'));
  assert.match(card.replaceAll("<!-- -->", ""), /9 bài/);
  assert.match(card, /CHỜ NGHIỆM THU/);
  assert.doesNotMatch(card, /CHỜ XÂY DỰNG LẠI/);
  const home = await (await render("/")).text();
  assert.ok(home.includes('href="' + overview + '"'));
  const downloads = await (await render("/downloads")).text();
  const split = downloads.indexOf('id="previous-editions"');
  assert.ok(split > 0);
  assert.ok(downloads.slice(0, split).includes('href="' + zip + '"'));
  assert.ok(!downloads.slice(split).includes('href="' + zip + '"'));
  const scope = await render("/roadmap/41");
  assert.equal(scope.status, 307);
  assert.equal(scope.headers.get("location"), overview);
  assert.equal((await render("/projects/lennard-jones-pair")).status, 404);
});

test("Project 41 renders the challenge, source, glossary and all nine Canvas modes", async () => {
  const page = await render(overview);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /id="challenge-41"/);
  assert.match(html, /aria-label="Chờ nghiệm thu"/);
  assert.ok(html.includes('href="' + zip + '"'));
  for (const [index, lesson] of project.lessons.entries()) {
    const route = overview + "/" + lesson.slug;
    assert.ok(html.includes('href="' + route + '"'), route);
    const response = await render(route);
    assert.equal(response.status, 200, route);
    const body = await response.text();
    assert.ok(body.includes('data-geometry-workshop="' + modes[index] + '"'), route);
    assert.match(body, /checkpoint-source/);
    assert.match(body, /one-dark-pro/);
    assert.doesNotMatch(body, /katex-error/);
    const next = project.lessons[index + 1];
    if (next) assert.ok(body.includes('href="' + overview + "/" + next.slug + '"'));
    else {
      assert.ok(body.includes('href="' + zip + '"'));
      assert.match(body, /ma-hoan-chinh-cua-project/);
    }
  }
  const glossary = await (await render("/glossary")).text();
  for (const id of [
    "parametric-surface",
    "mobius-reversed-seam",
    "sweep-frame",
    "obj-round-trip",
  ]) {
    assert.ok(glossary.includes('id="' + id + '"'), id);
  }
});
