import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import remarkMath from "remark-math";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { findLessonSection } from "../lib/lesson-sections.mjs";
import { migrateProgressContent } from "../lib/progress-content.ts";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(workspace, "examples/project-38-charged-particle-chamber");
const read = (relative) => readFile(path.join(workspace, relative), "utf8");

test("Project 38 catalog owns twelve charged-chamber checkpoints and invalidates retired progress", async () => {
  const catalog = JSON.parse(await read("course/projects.json"));
  const entry = catalog.find((p) => p.id === "38");
  assert.equal(entry.slug, "charged-particle-chamber");
  assert.equal(entry.checkpointCount, 12);
  assert.equal(entry.sourceDirectory, "project-38-charged-particle-chamber");
  assert.equal(entry.demoId, "charged-particle-chamber");
  assert.equal(entry.shaderRuntimePerTarget, true);
  assert.equal(entry.contentRevision, 2);
  const old = {
    completedLessonIds: ["p37-l11", "p38-l01", "p38-l10", "p39-l01"],
    lastLessonId: "p38-l10",
    lastLesson: {
      id: "p38-l10",
      title: "retired fountain",
      href: "/projects/five-million-particle-fountain/old",
    },
  };
  const next = migrateProgressContent(old, { p38: entry.contentRevision });
  assert.deepEqual(next.completedLessonIds, ["p37-l11", "p39-l01"]);
  assert.equal(next.lastLesson, undefined);
  const completed = { ...next, completedLessonIds: [...next.completedLessonIds, "p38-l01"] };
  assert.deepEqual(migrateProgressContent(completed, { p38: 2 }), completed);
});

test("all twelve lessons compile and every instructional C++/GLSL block is contiguous in its checkpoint", async () => {
  const directory = path.join(workspace, "content/charged-particle-chamber");
  const files = (await readdir(directory)).filter((f) => f.endsWith(".mdx")).sort();
  assert.equal(files.length, 12);
  for (const [index, file] of files.entries()) {
    const source = await readFile(path.join(directory, file), "utf8");
    await compile(source, { remarkPlugins: [remarkMath] });
    const roles = [...source.matchAll(/^## (.+)$/gm)]
      .map((m) => findLessonSection(m[1])?.key)
      .filter(Boolean);
    assert.deepEqual(
      roles,
      ["problem", "model", "code", "assembly", "experiments", "validation", "extensions"],
      file,
    );
    assert.ok(
      [...source.matchAll(/^### \d+\./gm)].length >= 3,
      file + " must explain at least three construction steps",
    );
    const blocks = [...source.matchAll(/```(cpp|glsl) title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g)];
    assert.ok(blocks.length >= 3, file + " must have at least three traceable code blocks");
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
  }
});

test("native model remains force-based, full-time, reproducible and distinct from retired fountain", async () => {
  const prefix = "examples/project-38-charged-particle-chamber/source-template/";
  const math = await read(prefix + "include/chamber_math.hpp");
  const reference = await read(prefix + "include/chamber_reference.hpp");
  const kernel = await read(prefix + "shaders/particle_update.comp");
  const vertex = await read(prefix + "shaders/particle.vert");
  for (const symbol of [
    "sizeof(Particle) == 32",
    "alignof(Particle) == 16",
    "stepBoris",
    "oldVelocity + nextVelocity",
    "sameSettings",
    "discardedSeconds",
  ])
    assert.ok(math.includes(symbol), symbol);
  assert.match(kernel, /if \(id >= uCount\) return;[\s\S]*Particle p = particles\[id\]/);
  assert.match(kernel, /cross\(vMinus, t\)/);
  assert.match(kernel, /particles\[id\]\.velocityMass\.xyz = nextVelocity/);
  assert.doesNotMatch(kernel, /\b(respawn|lifetime|gravity)\s*\(/);
  assert.match(vertex, /uint\(gl_VertexID\)/);
  assert.doesNotMatch(vertex, /uniform\s+float\s+(uTime|uDt)/);
  assert.match(reference, /Independent double-precision closed form/);
  assert.match(reference, /snapshotParticle/);
  assert.match(reference, /span \* random01\(id, 5U, settings.seed\)/);
});

test("jobs distinguish full validation from bounded inspector and never pass incomplete work", async () => {
  const prefix = "examples/project-38-charged-particle-chamber/source-template/include/";
  const probe = await read(prefix + "chamber_probe.hpp");
  const validation = await read(prefix + "chamber_validation.hpp");
  const benchmark = await read(prefix + "chamber_benchmark.hpp");
  const timing = await read(prefix + "chamber_timing.hpp");
  const app = await read(prefix + "chamber_application.hpp");
  assert.match(probe, /capture_\.generation = state.generation/);
  assert.match(probe, /GL_BUFFER_UPDATE_BARRIER_BIT/);
  assert.match(probe, /lastSampleTime/);
  assert.match(validation, /scratch_\.resize\(8192U\)/);
  assert.match(validation, /complete && report.passed\(\) && analyticFailures == 0U/);
  assert.match(validation, /30000/);
  assert.match(validation, /Cancelled: incomplete, not PASS/);
  assert.match(benchmark, /kSamples = 20U/);
  assert.match(benchmark, /kWarmups = 4/);
  assert.match(timing, /GL_QUERY_RESULT_AVAILABLE/);
  assert.match(app, /Camera\/viewport changed: incomplete/);
  assert.ok(
    app.indexOf("SDL_PollEvent") < app.indexOf("logicalWidth <= 0"),
    "Quit must work before zero-size skip",
  );
  assert.match(app, /controls.singleStep && !held/);
});

test("Canvas discloses sample count, uses pointer capture/DPR/reduced-motion, and does not fake GPU timings", async () => {
  const component = await read("components/labs/charged-particle-chamber-lab.tsx");
  const controls = await read("components/labs/charged-particle-chamber/controls.tsx");
  const readout = await read("components/labs/charged-particle-chamber/readout.tsx");
  const controller = await read("lib/labs/charged-particle-chamber/controller.ts");
  for (const symbol of [
    "setPointerCapture",
    "releasePointerCapture",
    "useCanvasSize",
    "useReducedMotion",
    "IntersectionObserver",
    "cancelAnimationFrame",
  ])
    assert.ok(component.includes(symbol), symbol);
  assert.match(controls, /reducedMotion/);
  assert.match(readout, /hạt CPU/);
  assert.match(readout, /không đọc GPU của bạn/);
  assert.match(controller, /Math.min\(DEMO_COUNT, this.state.active.count\)/);
  assert.match(controller, /deadline: now \+ 8000/);
  assert.match(controller, /work.done \+ 128/);
  assert.doesNotMatch(controller, /Math.random\(|setInterval\(/);
});
