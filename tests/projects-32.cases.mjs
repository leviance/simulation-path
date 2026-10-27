import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { workspace } from "./site-support.mjs";

const projectRoot = path.join(workspace, "examples", "project-32-memory-layout-race");
const contentRoot = path.join(workspace, "content", "memory-layout-race");
const read = (relative) => readFile(path.join(workspace, relative), "utf8");
const snapshot = (checkpoint, file) => readFile(path.join(projectRoot, checkpoint, file), "utf8");

test("Project 32 publishes eight actual fountain milestones without making N-body a prerequisite", async () => {
  const catalog = JSON.parse(await read("course/projects.json"));
  const project = catalog.find((entry) => entry.id === "32");
  assert.equal(project.slug, "memory-layout-race");
  assert.equal(project.sourceDirectory, "project-32-memory-layout-race");
  assert.equal(project.checkpointCount, 8);
  assert.equal(project.contentRevision, 1);
  const manifest = await read("course/projects/p32/manifest.ts");
  assert.match(manifest, /1\.000\.000 hạt sống/);
  assert.match(manifest, /Không cần học N-body/);
  assert.match(manifest, /emission carry/);
  assert.match(manifest, /Không giảm số được cập nhật/);
});

test("Project 32 lesson content explains lifecycle before layouts and preserves native/Canvas limits", async () => {
  const files = (await readdir(contentRoot)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(files.length, 8);
  const lessons = await Promise.all(
    files.map((file) => readFile(path.join(contentRoot, file), "utf8")),
  );
  const contracts = [
    [/44 MB/, /256/, /warmParticle/, /Simulation/, /chưa có bước vật lý/],
    [/planEmission/, /remaining/, /generation/, /beginStep/, /tickStep/, /6 ms/],
    [/trialUpdated/, /ba pass/, /warm-up/, /checksum/i, /SoA chưa đo/],
    [/mười một/, /writeParticle/, /readParticle/, /tickConversion/, /emissionRemainder/],
    [/updateSoARange/, /particleErrorRatio/, /10⁻⁶ s/, /400 bước/],
    [/offsetof/, /44 line/, /4 line/, /aligned base/, /cận trên/],
    [/AB\/BA/, /1\.000\.000/, /Release/, /không flush cache/, /chậm hơn/],
    [
      /--smoke-workflow/,
      /từng slot/,
      /ctest --test-dir build -C Debug/,
      /ctest --test-dir build -C Release/,
      /Project 33/,
    ],
  ];
  for (const [index, patterns] of contracts.entries()) {
    for (const pattern of patterns)
      assert.match(lessons[index], pattern, files[index] + " is missing " + pattern);
    assert.ok(
      (lessons[index].match(/```cpp title=/g) ?? []).length >= 3,
      files[index] + " must explain real code",
    );
    assert.doesNotMatch(lessons[index], /24 MB|sáu vector|kParticleCount|integrateAoS|showSoA/);
    assert.match(lessons[index], /## Tự kiểm tra kết quả/);
    assert.match(lessons[index], /## Bài tập mở rộng/);
  }
});

test("Project 32 source introduces real lifecycle, conversion and paired measurement in separate checkpoints", async () => {
  const milestones = [
    ["01", "include/particles.hpp", /warmParticle\(std::uint32_t\(index\), config\)/],
    ["02", "include/particles.hpp", /inline bool advanceParticle/],
    ["03", "include/benchmark.hpp", /struct BenchmarkJob/],
    ["04", "include/storage.hpp", /struct ParticlesSoA/],
    ["05", "include/storage.hpp", /inline std::size_t updateSoARange/],
    ["06", "include/benchmark.hpp", /inline TrafficModel modelTraffic/],
    ["07", "include/benchmark.hpp", /paired = true;/],
    ["08", "include/application.hpp", /simulation.reset\(1'000'000\);/],
  ];
  for (const [checkpoint, file, pattern] of milestones) {
    const previous =
      checkpoint === "01"
        ? "starter"
        : "checkpoints/" + String(Number(checkpoint) - 1).padStart(2, "0");
    assert.doesNotMatch(
      await snapshot(previous, file),
      pattern,
      checkpoint + " exposes its change too early",
    );
    assert.match(await snapshot("checkpoints/" + checkpoint, file), pattern);
  }
  const particles = await snapshot("final", "include/particles.hpp");
  assert.match(particles, /sizeof\(ParticleAoS\) == 44/);
  assert.match(particles, /dt - remaining/);
  assert.match(particles, /generation \+ 1/);
  const benchmark = await snapshot("final", "include/benchmark.hpp");
  assert.match(benchmark, /trialUpdated \+= end - target/);
  assert.match(benchmark, /maximumErrorRatio > 1/);
  assert.match(benchmark, /samples.size\(\) != 5/);
});

test("Project 32 Canvas owns finite worker jobs and cleans up all resource lifecycles", async () => {
  const canvas = await read("components/labs/memory-layout-race-lab.tsx");
  const worker = await read("components/labs/workers/memory-layout-benchmark-worker.ts");
  const hook = await read("components/labs/fountain/use-benchmark.ts");
  const session = await read("components/labs/fountain/benchmark-session.ts");
  const results = await read("components/labs/fountain/results.tsx");
  assert.match(canvas, /setPointerCapture\(event.pointerId\)/);
  assert.match(canvas, /onLostPointerCapture/);
  assert.match(canvas, /usePauseOnReducedMotion\(stop\)/);
  assert.match(canvas, /cancelAnimationFrame/);
  assert.match(canvas, /beginConversion/);
  assert.match(worker, /setTimeout\(tick/);
  assert.match(worker, /command.requestId !== requestId/);
  assert.match(hook, /progress.requestId === epoch.current/);
  assert.match(session, /event.data.requestId !== command.requestId/);
  assert.match(session, /terminate\(\)/);
  assert.match(session, /35000/);
  assert.match(hook, /memory-layout-benchmark-worker\.ts\?worker&url/);
  assert.doesNotMatch(hook, /new URL\(/);
  assert.match(results, /Object JavaScript không có layout 44 B/);
  assert.match(results, /row.paired/);
  assert.match(results, /maximumErrorRatio/);
  const legacy = await read("lib/labs/memory-layout.ts");
  assert.match(legacy, /export \* from ".\/fountain\/state.ts"/);
  assert.doesNotMatch(legacy, /function integrateAoS|function integrateSoA/);
});

test("Project 32 native presentation retains lifecycle and whole-step telemetry", async () => {
  const panel = await snapshot("final", "include/render_panel.hpp");
  assert.match(panel, /STEP-WALL/);
  assert.match(panel, /simulation\.wholeStepMs/);
  assert.match(panel, /BIRTHS %zu RESPAWNS %zu/);
  assert.match(panel, /simulation\.born, simulation\.respawned/);
  assert.match(panel, /DRAW\/UPLOAD/);
  assert.match(panel, /simulation\.conversionMs/);
});

test("Project 32 uses the reference grid without adding a decorative pedestal or basin", async () => {
  const surface = await snapshot("final", "include/render_surface.hpp");
  const canvas = await read("lib/labs/fountain/render-surface.ts");
  assert.doesNotMatch(surface + canvas, /drawBasin|drawNozzle|basinDepth|cylinder\(/);
  assert.match(surface, /const double line =/);
  assert.match(canvas, /const line =/);
  assert.match(await snapshot("final", "include/render_geometry.hpp"), /fountainFloorY = 0/);
});
