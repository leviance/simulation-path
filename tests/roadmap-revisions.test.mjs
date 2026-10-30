import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { roadmapSeed } from "../course/roadmap.ts";
import { roadmapRevisions } from "../course/roadmap-revisions.ts";
import { buildRoadmap } from "../lib/roadmap-state.ts";

const catalog = JSON.parse(
  await readFile(new URL("../course/projects.json", import.meta.url), "utf8"),
);
const published = catalog.map((project) => {
  const target = roadmapSeed.find((entry) => entry.id === Number(project.id));
  const revision = roadmapRevisions[project.id];
  return {
    id: project.id,
    slug: project.slug,
    title: revision?.previousTitle ?? target.title,
    part: revision?.previousPart ?? target.part,
    summary: "Available lesson content",
    status: "published",
    duration: "1 giờ",
    lessonCount: project.checkpointCount,
    download: `/downloads/${project.sourceDirectory}.zip`,
    demoId: project.demoId,
  };
});

test("roadmap titles and order follow all 78 product specification contracts", async () => {
  const spec = await readFile(
    new URL(
      "../docs/specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md",
      import.meta.url,
    ),
    "utf8",
  );
  const contracts = [...spec.matchAll(/^## Project (\d{2}) — (.+)$/gm)];
  assert.equal(contracts.length, 78);
  assert.deepEqual(
    roadmapSeed.map(({ id, title }) => [id, title]),
    contracts.map(([, id, title]) => [Number(id), title.trim()]),
  );
});

test("planned products never inherit the old lesson count, demo, duration or download", () => {
  const roadmap = buildRoadmap(roadmapSeed, published, roadmapRevisions);
  assert.equal(roadmap.length, 78);
  const revised = roadmap.filter((project) => project.status === "awaiting-rebuild");
  assert.deepEqual(
    revised.map(({ id }) => id),
    Object.keys(roadmapRevisions),
  );
  for (const project of revised) {
    assert.equal(project.title, roadmapSeed[Number(project.id) - 1].title);
    assert.equal(project.summary, roadmapRevisions[project.id].summary);
    assert.equal(project.previous.title, roadmapRevisions[project.id].previousTitle);
    assert.notEqual(project.title, project.previous.title);
    assert.notEqual(project.slug, project.previous.slug);
    for (const key of ["download", "demoId", "lessonCount", "duration"]) {
      assert.equal(key in project, false, `${project.id} must not advertise previous ${key}`);
    }
    assert.ok(project.previous.download.endsWith(".zip"));
  }
  assert.equal(
    roadmap.filter(({ status }) => status === "published").length,
    catalog.length - revised.length,
  );
  assert.equal(
    roadmap.filter(({ status }) => status === "coming-soon").length,
    78 - catalog.length,
  );
  assert.deepEqual(
    roadmap.slice(65).map(({ id }) => id),
    Array.from({ length: 13 }, (_, i) => String(66 + i)),
  );
});

test("revision metadata is guarded and deleting a fulfilled revision restores publication", () => {
  assert.throws(
    () => buildRoadmap(roadmapSeed, published, { 99: roadmapRevisions["41"] }),
    /existing published project/,
  );
  const { 41: fulfilled, ...remaining } = roadmapRevisions;
  assert.ok(fulfilled);
  const newPublication = published.map((entry) =>
    entry.id === "41"
      ? { ...entry, title: roadmapSeed[40].title, part: roadmapSeed[40].part }
      : entry,
  );
  const released = buildRoadmap(roadmapSeed, newPublication, remaining).find(
    ({ id }) => id === "41",
  );
  assert.equal(released.status, "published");
  assert.equal(released.title, roadmapSeed[40].title);
});

async function readGeneratedModules(directory, exportName) {
  const files = (await readdir(directory)).filter(
    (file) => file.endsWith(".ts") && file !== "loaders.ts",
  );
  const modules = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(new URL(file, directory), "utf8");
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ES2022 },
      });
      return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
    }),
  );
  return modules.flatMap((module) => module[exportName] ?? []);
}

test("search indexes new products separately and labels every previous lesson", async () => {
  const items = await readGeneratedModules(
    new URL("../course/generated/search/", import.meta.url),
    "items",
  );
  assert.equal(new Set(items.map(({ href }) => href)).size, items.length);
  for (const [id, revision] of Object.entries(roadmapRevisions)) {
    const target = items.find(({ href }) => href === `/roadmap/${id}`);
    assert.ok(target, `New product ${id} is searchable`);
    assert.equal(target.kind, "Chờ xây dựng lại");
    assert.ok(target.title.includes(roadmapSeed[Number(id) - 1].title));
    const previous = published.find((project) => project.id === id);
    assert.equal(items.find(({ href }) => href === `/projects/${previous.slug}`).kind, "Bản cũ");
    const lessons = items.filter(({ href }) => href.startsWith(`/projects/${previous.slug}/`));
    assert.equal(lessons.length, previous.lessonCount);
    assert.ok(lessons.every(({ kind }) => kind === `Bản cũ · Dự án ${id}`));
    assert.ok(revision.interactions.length > 0 && revision.concepts.length > 0);
  }
});

test("generated summaries retain actual previous titles and progress is not invalidated", async () => {
  const summaries = await readGeneratedModules(
    new URL("../course/generated/summaries/", import.meta.url),
    "summaries",
  );
  for (const [id, revision] of Object.entries(roadmapRevisions)) {
    const previous = summaries.find((entry) => entry.id === id);
    assert.equal(previous.title, revision.previousTitle);
    assert.equal(previous.slug, published.find((entry) => entry.id === id).slug);
    assert.equal(previous.part, revision.previousPart ?? roadmapSeed[Number(id) - 1].part);
  }
  const { previousEditionProjectIds, progressContentVersions } =
    await import("../course/generated/progress/versions.ts");
  assert.deepEqual(
    previousEditionProjectIds,
    Object.keys(roadmapRevisions).map((id) => `p${id}`),
  );
  assert.deepEqual(
    progressContentVersions,
    Object.fromEntries(
      catalog
        .filter(({ contentRevision }) => contentRevision)
        .map(({ id, contentRevision }) => [`p${id}`, contentRevision]),
    ),
  );
});

test("glossary examples identify superseded project products explicitly", async () => {
  const gpu = await readFile(new URL("../lib/glossary-gpu.ts", import.meta.url), "utf8");
  const physics = await readFile(new URL("../lib/glossary-physics.ts", import.meta.url), "utf8");
  for (const [source, ids] of [
    [gpu, ["38", "39", "40"]],
    [physics, ["41", "42", "43"]],
  ]) {
    for (const id of ids) {
      assert.match(source, new RegExp(`bản cũ của Project ${id}`, "i"));
    }
  }
});
