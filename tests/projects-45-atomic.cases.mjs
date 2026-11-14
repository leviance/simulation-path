import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compile, createProcessor } from "@mdx-js/mdx";
import project from "../course/projects/p45/manifest.ts";
import lab from "../course/projects/p45/lab.ts";
import learning from "../course/projects/p45/learning.ts";
import { roadmapRevisions } from "../course/roadmap-revisions.ts";
import { atomicPlaygroundGlossaryTerms } from "../lib/glossary-atomic-playground.ts";
import { lessonSections } from "../lib/lesson-sections.mjs";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { migrateProgressContent } from "../lib/progress-content.ts";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";
import { interactiveLabUsages, lessonSectionUsages } from "../scripts/mdx-contracts.mjs";
import { projectCatalog, render, workspace, walkFiles } from "./site-support.mjs";

const slug = "atomic-playground",
  directory = "project-45-atomic-playground";
const source = path.join(workspace, "examples", directory),
  content = path.join(workspace, "content", slug);
const modes = [
  "field",
  "measure",
  "cdf",
  "gpu",
  "batches",
  "splats",
  "clip",
  "probe",
  "compare",
  "config",
  "validation",
];
const checkpoint = (order, file) =>
  readFile(
    path.join(source, order ? `checkpoints/${String(order).padStart(2, "0")}` : "starter", file),
    "utf8",
  );
const lessonText = (lesson) => readFile(path.join(content, lesson.slug + ".mdx"), "utf8");

test("Atomic Project45 replaces GPU MD with its own content revision and honest million-point challenge", () => {
  assert.deepEqual(
    projectCatalog.find((entry) => entry.id === "45"),
    {
      id: "45",
      slug,
      sourceDirectory: directory,
      checkpointCount: 11,
      demoId: slug,
      contentRevision: 2,
      shaderRuntimePerTarget: true,
    },
  );
  assert.equal(roadmapRevisions["45"].replacement.slug, slug);
  assert.equal(roadmapRevisions["45"].previousSlug, "molecular-lab-gpu");
  assert.equal(project.lessons.length, 11);
  assert.match(project.challenge.outcome, /một triệu/);
  assert.match(project.challenge.outcome, /GPU/);
  assert.match(
    project.challenge.constraints.join(" "),
    /một triệu điểm không có nghĩa một triệu electron/,
  );
  assert.match(project.challenge.constraints.join(" "), /CPU.*không thay mốc một triệu GPU/);
  const migrated = migrateProgressContent(
    {
      completedLessonIds: ["p44-l12", "p45-l01", "p45-l10", "p46-l01"],
      lastLessonId: "p45-l10",
      lastLesson: { id: "p45-l10", title: "old", href: "/projects/molecular-lab-gpu/old" },
      projectContentVersions: { p44: 2 },
    },
    { p45: 2 },
  );
  assert.deepEqual(migrated.completedLessonIds, ["p44-l12", "p46-l01"]);
  assert.equal(migrated.lastLessonId, undefined);
  assert.equal(migrated.lastLesson, undefined);
  assert.equal(migrated.projectContentVersions.p44, 2);
  assert.equal(migrated.projectContentVersions.p45, 2);
  assert.deepEqual(
    migrateProgressContent(
      { completedLessonIds: ["p45-l01"], projectContentVersions: { p45: 2 } },
      { p45: 2 },
    ).completedLessonIds,
    ["p45-l01"],
  );
});

test("all eleven Atomic lessons have seven teaching roles and strictly contiguous real C++/GLSL excerpts", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.deepEqual(
    files,
    project.lessons.map((lesson) => lesson.slug + ".mdx"),
  );
  assert.deepEqual(Object.keys(lab.modes), modes);
  let cpp = 0,
    glsl = 0;
  for (const [index, lesson] of project.lessons.entries()) {
    assert.equal(lesson.id, `p45-l${String(index + 1).padStart(2, "0")}`);
    assert.equal(lesson.order, index + 1);
    const text = await lessonText(lesson);
    assert.ok(Buffer.byteLength(text) <= 32768, lesson.slug);
    assert.deepEqual(
      lessonSectionUsages(text).map((section) => section.key),
      lessonSections.map((section) => section.key),
    );
    assert.deepEqual(interactiveLabUsages(text, lesson.slug), [{ demo: slug, mode: modes[index] }]);
    assert.doesNotMatch(
      text,
      /^\s*#(?:if|elif|define)\s+LAB_CHECKPOINT/m,
      "learner snippets must be actual snapshots",
    );
    const time = text
      .match(/^Dự kiến (\d+) phút:.+$/m)?.[0]
      .match(/\d+/g)
      .map(Number);
    assert.equal(time?.[0], lesson.estimatedMinutes, lesson.slug);
    assert.equal(
      time?.slice(1).reduce((sum, value) => sum + value, 0),
      lesson.estimatedMinutes,
      lesson.slug,
    );
    assert.ok((text.match(/^### Thí nghiệm \d+ /gm) ?? []).length >= 2, lesson.slug);
    const blocks = [
      ...text.matchAll(/^```(cpp|glsl) title="([^"\r\n]+)"\r?\n([\s\S]*?)\r?\n```$/gm),
    ];
    assert.ok(blocks.length >= 2, lesson.slug + " must explain actual implementation changes");
    for (const [, language, title, excerpt] of blocks) {
      const file = title.split(" — ")[0];
      assert.match(
        file,
        language === "cpp"
          ? /^(?:include|src|tests)\/[\w./-]+\.(?:hpp|cpp)$/
          : /^shaders\/[\w./-]+\.(?:comp|vert|frag|glsl)$/,
      );
      const actual = file.startsWith("tests/")
        ? await readFile(path.join(source, file), "utf8")
        : await checkpoint(index + 1, file);
      assert.ok(isContiguousCodeExcerpt(excerpt, actual), lesson.slug + ": " + title);
      if (language === "cpp") ++cpp;
      else ++glsl;
    }
    if (index < 10)
      assert.ok(text.includes(`](/projects/${slug}/${project.lessons[index + 1].slug})`));
  }
  assert.ok(cpp > 0 && glsl > 0, "both host and actual shader code must be taught");
});

test("Atomic checkpoint gates teach small CPU, GPU, million, rendering, probe, comparison and configuration in order", async () => {
  assert.doesNotMatch(
    await checkpoint(1, "include/atom_app.hpp"),
    /previewTables_ = buildTables\(config_\.primary\)/,
  );
  assert.match(
    await checkpoint(2, "include/atom_app.hpp"),
    /previewTables_ = buildTables\(config_\.primary\)/,
  );
  assert.doesNotMatch(await checkpoint(2, "include/atom_app.hpp"), /points\.push_back\(sampleCpu/);
  assert.match(await checkpoint(3, "include/atom_app.hpp"), /points\.push_back\(sampleCpu/);
  assert.doesNotMatch(
    await checkpoint(3, "include/atom_app.hpp"),
    /const bool published = pane\(index\)\.tick/,
  );
  assert.match(
    await checkpoint(4, "include/atom_app.hpp"),
    /const bool published = pane\(index\)\.tick/,
  );
  assert.match(await checkpoint(4, "include/atom_sampler.hpp"), /count\{16384\}/);
  assert.match(await checkpoint(5, "include/atom_sampler.hpp"), /count\{1000000\}/);
  assert.doesNotMatch(
    await checkpoint(3, "include/atom_gpu.hpp"),
    /program_\(gl, "sample\.comp"\)/,
  );
  assert.match(await checkpoint(4, "include/atom_gpu.hpp"), /program_\(gl, "sample\.comp"\)/);
  assert.match(await checkpoint(4, "include/atom_gpu.hpp"), /batchCount = config_\.count - next_/);
  assert.doesNotMatch(
    await checkpoint(4, "include/atom_gpu.hpp"),
    /batchCount = std::min<std::uint32_t>\(32768/,
  );
  assert.match(
    await checkpoint(5, "include/atom_gpu.hpp"),
    /batchCount = std::min<std::uint32_t>\(32768/,
  );
  assert.doesNotMatch(await checkpoint(5, "include/atom_render.hpp"), /TexImage2D\(/);
  assert.match(await checkpoint(6, "include/atom_render.hpp"), /TexImage2D\(/);
  for (const [order, expression] of [
    [6, /action == Action::palette/],
    [7, /action == Action::clip/],
    [8, /action == Action::probe/],
    [9, /action == Action::compare/],
    [10, /action == Action::save/],
  ]) {
    assert.doesNotMatch(
      await checkpoint(order - 1, "include/atom_events.hpp"),
      expression,
      "introduced early: " + order,
    );
    assert.match(
      await checkpoint(order, "include/atom_events.hpp"),
      expression,
      "missing: " + order,
    );
  }
  assert.doesNotMatch(await checkpoint(7, "include/atom_app.hpp"), /measurement\.request\(/);
  assert.match(await checkpoint(8, "include/atom_app.hpp"), /measurement\.request\(/);
  assert.doesNotMatch(await checkpoint(7, "include/atom_probe.hpp"), /DispatchCompute\(/);
  assert.match(await checkpoint(8, "include/atom_probe.hpp"), /DispatchCompute\(/);
  assert.doesNotMatch(await checkpoint(10, "include/atom_app.hpp"), /make_unique<GpuEvaluation>/);
  assert.match(await checkpoint(11, "include/atom_app.hpp"), /make_unique<GpuEvaluation>/);
  for (let order = 0; order <= 11; ++order) {
    for (const file of [
      "src/main.cpp",
      "include/atom_app.hpp",
      "include/atom_events.hpp",
      "include/atom_sampler.hpp",
    ])
      assert.doesNotMatch(await checkpoint(order, file), /^\s*#.*LAB_CHECKPOINT/m);
  }
  const finalFiles = await walkFiles(path.join(source, "final"));
  assert.ok(finalFiles.length >= 25);
  for (const file of finalFiles) {
    const relative = path.relative(path.join(source, "final"), file);
    assert.deepEqual(
      await readFile(file),
      await readFile(path.join(source, "checkpoints/11", relative)),
      relative,
    );
  }
  const cmake = await readFile(path.join(source, "CMakeLists.txt"), "utf8");
  assert.match(cmake, /set\(PROJECT_CHECKPOINT_COUNT 11\)/);
  assert.match(cmake, /SDL3::SDL3/);
  assert.match(cmake, /SDL3 3\.4\.8 EXACT/);
  assert.match(cmake, /shaders\/\$\{name\}/);
});

test("Atomic native path genuinely evaluates and samples on GPU with bounded lifecycle and independent oracles", async () => {
  const final = (file) => readFile(path.join(source, "final", file), "utf8");
  const sampler = await final("shaders/sample.comp"),
    probe = await final("shaders/probe.comp"),
    gpu = await final("include/atom_gpu.hpp");
  assert.match(sampler, /gl_GlobalInvocationID\.x/);
  assert.match(sampler, /radialCdf/);
  assert.match(sampler, /angularCdf/);
  assert.match(sampler, /orbitalDensity\(/);
  assert.match(sampler, /points\[index\]\s*=\s*PointRecord\(/);
  assert.match(sampler, /pointCount-startIndex|pointCount - startIndex/);
  assert.match(gpu, /ClientWaitSync\(fence_, 0, 0\)/);
  assert.match(gpu, /chrono::seconds\(3\)/);
  assert.match(gpu, /32768/);
  assert.doesNotMatch(gpu, /\.Finish\(/);
  assert.match(probe, /measurement\[3\]/);
  assert.match(probe, /measurement\[20\]/);
  assert.match(probe, /length\s*\(record\.xyz\)\s*>\s*rMax\s*\*\s*1\.000002/);
  const app = await final("include/atom_app.hpp"),
    scene = await final("include/atom_scene.hpp");
  assert.match(scene, /candidateGeneration_ == requested_/);
  assert.match(scene, /active_ = std::move\(candidate_\)/);
  assert.match(app, /pane\(index\)\.tick\(!measurement\.busy\(\) && evaluationIdle\)/);
  assert.match(app, /const bool evaluationIdle = !evaluation \|\| !evaluation->busy\(\)/);
  assert.match(app, /probeJobGeneration_/);
  assert.match(app, /probeJobRevision_\[index\] != probeRevision_/);
  assert.match(app, /measurement\.values\(\)\[0\] == cloud->accepted\(\)/);
  assert.match(app, /measurement\.values\(\)\[21\] == 0/);
  assert.match(app, /!probesFinished\(\)/);
  assert.match(app, /workload != drawWorkload_/);
  assert.match(app, /drawSamples_\.clear\(\)/);
  assert.match(app, /!primary_\.current\(\)/);
  const report = await final("include/atom_report.hpp");
  assert.match(report, /DRAW_WORKLOAD/);
  assert.match(report, /camera_target=/);
  assert.match(report, /probe_state=pending/);
  assert.match(report, /probe_state=not_current/);
  const capabilities = await final("include/atom_capabilities.hpp");
  assert.match(capabilities, /GL_MAX_SHADER_STORAGE_BLOCK_SIZE/);
  assert.match(capabilities, /GL_MAX_COMPUTE_WORK_GROUP_COUNT/);
  assert.match(capabilities, /SDL_VERSIONNUM\(3, 4, 8\)/);
  const panel = await final("include/atom_panel.hpp");
  assert.match(panel, /overlay\.text\(x, 158, "WRONG SAMPLER EXPERIMENT/);
  const verifier = await final("include/atom_verify.hpp"),
    tests = await readFile(path.join(source, "tests/tests.cpp"), "utf8");
  assert.match(verifier, /1000003/);
  assert.match(verifier, /std::chrono::seconds\(30\)/);
  assert.match(verifier, /uniformVolume/);
  assert.match(verifier, /affineMu/);
  assert.match(verifier, /referenceRadialHistogram/);
  assert.match(verifier, /candidate\.cancel\(\)/);
  assert.match(verifier, /budget\.reserved == baselineMemory/);
  assert.match(tests, /angularIntegral/);
  assert.match(tests, /radialIntegral/);
  assert.match(tests, /testDefaultTableApproximationAllowance/);
  assert.match(tests, /not a global bound/);
  assert.doesNotMatch(tests, /#include\s*<cassert>|\bassert\s*\(/);
  assert.match(tests, /EXIT_FAILURE/);
  assert.match(tests, /EXIT_SUCCESS/);
});

test("Atomic teaching C++ uses four-space blocks, explicit branches and documented RAII cleanup", async () => {
  const files = [
    ...(await walkFiles(path.join(source, "source-template"))),
    path.join(source, "tests/tests.cpp"),
  ].filter((file) => /\.(?:cpp|hpp)$/.test(file));
  for (const file of files) {
    const code = await readFile(file, "utf8");
    assert.doesNotMatch(code, /\t|\?[^\r\n:]+:/, file);
    assert.match(code, /^\s*\/\/ /m, file);
    for (const [index, line] of code.split(/\r?\n/).entries()) {
      const spaces = line.match(/^ +(?=\S)/)?.[0].length ?? 0;
      assert.equal(spaces % 4, 0, `${file}:${index + 1}`);
    }
  }
  const main = await readFile(path.join(source, "final/src/main.cpp"), "utf8");
  assert.match(main, /\/\/ Setup:/);
  assert.match(main, /\/\/ Cleanup:/);
});

test("Atomic references and code guides point at the actual files and supplied field glossary", async () => {
  const terms = new Set(atomicPlaygroundGlossaryTerms.map((term) => term.id));
  assert.equal(terms.size, 13);
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
    assert.ok(guide.expected.length >= 30);
    for (const file of guide.files)
      assert.ok(
        (
          await stat(
            path.join(source, file.startsWith("tests/") ? file : "source-template/" + file),
          )
        ).isFile(),
        file,
      );
    for (const reference of learning.references[lesson.id])
      if (reference.kind === "Thuật ngữ")
        assert.ok(terms.has(reference.href.split("#")[1]), reference.href);
  }
  const final = await lessonText(project.lessons[10]);
  assert.match(final, /1000003/);
  assert.match(final, /warm-up/);
  assert.match(final, /median/);
  assert.match(final, /p95/);
  assert.match(final, /ma-hoan-chinh-cua-project/);
});

test("Atomic real MDX compiles with One Dark, formulas and its lazy teaching Canvas", async () => {
  const containsMath = (node) =>
    node.type === "math" || node.type === "inlineMath" || (node.children ?? []).some(containsMath);
  const processor = createProcessor(courseMdxOptions);
  assert.ok(containsMath(processor.parse("A real formula: $x^2$.")));
  assert.equal(
    containsMath(processor.parse('```cmake\nset(ROOT "${CMAKE_CURRENT_SOURCE_DIR}")\n```')),
    false,
  );
  for (const lesson of project.lessons) {
    const text = await lessonText(lesson);
    const compiled = String(
      await compile(
        { value: text, path: path.join(content, lesson.slug + ".mdx") },
        courseMdxOptions,
      ),
    );
    assert.match(compiled, /CourseStaticMarkup/);
    assert.match(compiled, /one-dark-pro/);
    assert.ok(new Set(compiled.match(/#[0-9a-f]{6}/gi)).size >= 5, lesson.slug);
    assert.match(compiled, /InteractiveLab/);
    assert.doesNotMatch(compiled, /katex-error/);
    // A shell regex or CMake variable inside a code fence is not a formula.
    if (containsMath(processor.parse(text))) {
      assert.match(compiled, /katex-mathml/);
      assert.match(compiled, /application\/x-tex/);
    }
  }
});

test("Atomic rendered overview and all eleven routes expose real challenges, code and complete source", async () => {
  const response = await render(`/projects/${slug}`);
  assert.equal(response.status, 200);
  const html = (await response.text()).replaceAll("<!-- -->", "");
  assert.match(html, /id="challenge-45"/);
  assert.match(html, /ATOMIC PLAYGROUND/);
  assert.ok(html.includes(`href="/downloads/${directory}.zip"`));
  assert.doesNotMatch(html, /aria-label="Nội dung thuộc bản cũ"/);
  for (const lesson of project.lessons) {
    assert.ok(html.includes(`/projects/${slug}/${lesson.slug}`));
    const route = `/projects/${slug}/${lesson.slug}`,
      response = await render(route);
    assert.equal(response.status, 200, route);
    const body = await response.text();
    assert.ok(Buffer.byteLength(body) < 350 * 1024, route);
    assert.match(body, /one-dark-pro/);
    assert.match(body, /ma-chay-duoc-sau-bai/);
    assert.doesNotMatch(body, /katex-error/);
  }
});

test("Atomic retired GPU MD URLs redirect to the new overview rather than mismatched lessons", async () => {
  for (const route of [
    "/roadmap/45",
    "/projects/molecular-lab-gpu",
    "/projects/molecular-lab-gpu/01-contract-vao-gpu",
  ]) {
    const response = await render(route);
    assert.ok(response.status >= 300 && response.status < 400, route);
    assert.ok(response.headers.get("location")?.endsWith(`/projects/${slug}`), route);
  }
});

test("Atomic lazy production entry and teaching components stay inside the unchanged chunk budgets", async () => {
  const directory = path.join(workspace, "dist/client/_next/static/chunks"),
    files = await readdir(directory);
  const entryFile = files.find(
    (name) => name.startsWith("atomic-playground-lab-") && name.endsWith(".js"),
  );
  assert.ok(entryFile, "Missing atomic production entry");
  let importer = await readFile(path.join(directory, entryFile), "utf8");
  assert.ok((await stat(path.join(directory, entryFile))).size < 24 * 1024, entryFile);
  for (const prefix of ["workshop-", "trace-"]) {
    // Rolldown may emit a static import URL as a template literal. Follow the
    // actual import expression rather than a preload-table string or guessed name.
    const imports = [...importer.matchAll(/\bimport\(\s*["'`]([^"'`]+)["'`]\s*\)/g)];
    const file = imports
      .map((match) => path.basename(match[1]))
      .find((name) => name.startsWith(prefix));
    assert.ok(file, "Missing actual lazy import: " + prefix);
    assert.ok((await stat(path.join(directory, file))).size < 24 * 1024, file);
    importer = await readFile(path.join(directory, file), "utf8");
  }
  const entry = await readFile(
    path.join(workspace, "components/labs/atomic-playground-lab.tsx"),
    "utf8",
  );
  assert.match(entry, /lazy\(\(\)\s*=>\s*import\("\.\/atomic-playground\/workshop"\)/);
  for (const file of [
    ...(await walkFiles(path.join(workspace, "components/labs/atomic-playground"))),
    ...(await walkFiles(path.join(workspace, "lib/labs/atomic-playground"))),
  ])
    assert.ok((await stat(file)).size <= 32 * 1024, file);
});
