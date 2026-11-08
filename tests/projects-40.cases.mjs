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
const root = path.join(workspace, "examples/project-40-cloth-workshop");
const read = (relative) => readFile(path.join(workspace, relative), "utf8");
const source = (relative) => readFile(path.join(root, "source-template", relative), "utf8");
const modes =
  "surface|prediction|xpbd|topology|coloring|timestep|obstacles|grid|csr|self-contact|normals|interaction|validation|showcase";

test("Project 40 publishes cloth, preserves the roadmap target and revises only retired progress", async () => {
  const catalog = JSON.parse(await read("course/projects.json"));
  const entry = catalog.find((project) => project.id === "40");
  assert.equal(entry.slug, "cloth-workshop");
  assert.equal(entry.sourceDirectory, "project-40-cloth-workshop");
  assert.equal(entry.checkpointCount, 14);
  assert.equal(entry.demoId, "cloth-workshop");
  assert.equal(entry.shaderRuntimePerTarget, true);
  assert.equal(entry.contentRevision, 2);
  const old = {
    completedLessonIds: ["p39-l12", "p40-l01", "p40-l09", "p41-l01"],
    lastLessonId: "p40-l09",
    lastLesson: {
      id: "p40-l09",
      title: "Retired GPU Grid Workbench",
      href: "/projects/gpu-spatial-grid-neighbors/09-hoan-thien-gpu-grid-workbench",
    },
  };
  const migrated = migrateProgressContent(old, { p40: entry.contentRevision });
  assert.deepEqual(migrated.completedLessonIds, ["p39-l12", "p41-l01"]);
  assert.equal(migrated.lastLesson, undefined);
  const current = { ...migrated, completedLessonIds: [...migrated.completedLessonIds, "p40-l01"] };
  assert.deepEqual(migrateProgressContent(current, { p40: 2 }), current);
});

test("all fourteen cloth lessons compile, keep seven teaching roles and quote contiguous checkpoint source", async () => {
  const directory = path.join(workspace, "content/cloth-workshop");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(files.length, 14);
  for (const [index, file] of files.entries()) {
    const lesson = await readFile(path.join(directory, file), "utf8");
    await compile(lesson, { remarkPlugins: [remarkMath] });
    assert.ok(Buffer.byteLength(lesson) <= 32 * 1024, file + " exceeds lesson budget");
    const roles = [...lesson.matchAll(/^## (.+)$/gm)]
      .map((match) => findLessonSection(match[1])?.key)
      .filter(Boolean);
    assert.deepEqual(
      roles,
      ["problem", "model", "code", "assembly", "experiments", "validation", "extensions"],
      file,
    );
    assert.ok(
      [...lesson.matchAll(/^### \d+\./gm)].length >= 3,
      file + " needs explained construction steps",
    );
    const blocks = [...lesson.matchAll(/```(cpp|glsl) title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g)];
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
      lesson,
      new RegExp('<InteractiveLab demo="cloth-workshop" mode="(?:' + modes + ')"\\s*\\/>'),
    );
    const experiments =
      lesson.split("## Thử tạo lỗi")[1]?.split("## Checklist hoàn thành")[0] ?? "";
    assert.ok(
      [...experiments.matchAll(/^\d+\./gm)].length >= 2,
      file + " needs two intentional experiments",
    );
    assert.doesNotMatch(lesson, /TODO|FIXME|Checkpoint đang xây|code sẽ thêm sau/i);
  }
});

test("cloth physics includes weighted XPBD, explicit multiplier scope and finite bounded settings", async () => {
  const topology = await source("include/cloth_topology.hpp");
  const cpu = await source("include/cloth_cpu.hpp");
  const solver = await source("shaders/cloth_solver.comp");
  const gpu = await source("include/cloth_gpu.hpp");
  assert.match(topology, /side\{321U\}/);
  assert.match(topology, /side > 1001U/);
  assert.match(topology, /iterations > 12U/);
  assert.match(topology, /sizeof\(Constraint\) == 16U/);
  assert.match(topology, /inverseMass = 0\.0F/);
  assert.match(topology, /dihedral-angle model/);
  assert.match(cpu, /compliance \/ \(h \* h\)/);
  assert.match(cpu, /a\.w \+ b\.w \+ alpha/);
  assert.match(cpu, /lambda \+= increment/);
  assert.match(cpu, /std::fill\(lambdas\.begin\(\), lambdas\.end\(\), 0\.0F\)/);
  assert.match(solver, /lambdas\[id\] = 0\.0/);
  assert.match(solver, /alpha \* lambdas\[edgeId\]/);
  assert.match(solver, /exp\(-uDamping \* uH\)/);
  assert.match(gpu, /color < 12U/);
  assert.match(gpu, /GL_SHADER_STORAGE_BARRIER_BIT/);
  assert.doesNotMatch(gpu, /glFinish\s*\(/);
});

test("cloth contact graph uses three-dimensional CSR and a separate correction owner", async () => {
  const grid = await source("shaders/cloth_grid.comp");
  const scan = await source("shaders/cloth_scan.comp");
  const hierarchy = await source("include/cloth_scan.hpp");
  const gpu = await source("include/cloth_gpu.hpp");
  assert.match(
    grid,
    /uDimensions\.x \* \(uint\(coordinate\.y\) \+ uDimensions\.y \* uint\(coordinate\.z\)\)/,
  );
  assert.match(grid, /atomicAdd\(counts\[cell\], 1u\)/);
  assert.match(grid, /cursors\[id\] = offsets\[id\]/);
  assert.match(grid, /atomicAdd\(cursors\[vertexCells\[id\]\], 1u\)/);
  assert.match(grid, /sortedIds\[destination\] = id/);
  assert.match(scan, /outputValues\[id\] = scratch\[lane\] - value/);
  assert.match(hierarchy, /source = level\.sums/);
  assert.match(hierarchy, /const auto& parent = levels_\[index - 1U\]/);
  assert.match(grid, /for \(int dz = -1; dz <= 1; \+\+dz\)/);
  assert.match(grid, /topologyNeighbors\(id, other\)/);
  assert.match(grid, /float diameter = 2\.0 \* uThickness/);
  assert.match(grid, /distance >= diameter/);
  assert.match(grid, /corrections\[id\] = vec4\(correction, float\(contacts\)\)/);
  assert.match(grid, /umulExtended/);
  assert.match(grid, /diagnostic\[16\] > uCandidateBudget/);
  assert.match(gpu, /No contacts were truncated/);
  assert.match(gpu, /backupPosition/);
});

test("cloth curriculum separates material, approximation, native workload and pending evidence", async () => {
  const first = await read("content/cloth-workshop/01-mat-vai-dau-tien.mdx");
  const xpbd = await read("content/cloth-workshop/03-mot-rang-buoc-xpbd.mdx");
  const contacts = await read("content/cloth-workshop/10-tu-tiep-xuc-cua-vai.mdx");
  const last = await read("content/cloth-workshop/14-xuong-vai-hoan-chinh.mdx");
  const glossary = await read("lib/glossary-cloth-workshop.ts");
  assert.match(first, /scaffold/);
  assert.match(first, /102.720/);
  assert.match(xpbd, /m\/N/);
  assert.match(xpbd, /1\/3/);
  assert.match(xpbd, /số vòng hữu hạn/);
  assert.match(contacts, /continuous collision detection/);
  assert.match(contacts, /brute force/);
  assert.match(last, /ctest --test-dir build -C Debug/);
  assert.match(last, /ctest --test-dir build -C Release/);
  assert.match(last, /100\.000 đỉnh động/);
  assert.match(last, /một triệu/);
  assert.match(last, /project-40-cloth-workshop\.zip/);
  assert.match(glossary, /clothWorkshopGlossaryTerms/);
  assert.match(glossary, /cloth-vertex-self-contact/);
  for (const file of ["manifest.ts", "learning.ts", "lab.ts"]) {
    assert.ok((await stat(path.join(workspace, "course/projects/p40", file))).size <= 20 * 1024);
  }
});
