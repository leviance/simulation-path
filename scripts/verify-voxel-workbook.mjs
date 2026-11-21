// Optional native acceptance, one ZIP at a time. Never configures an author's checkout.
import assert from "node:assert/strict";
import path from "node:path";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { loadProjectCatalog, workspace } from "./project-catalog.mjs";
import { installShutdownHandlers, ProcessSupervisor } from "./process-supervisor.mjs";
import { replayLesson, snapshot, textAt, workPaths } from "./voxel-workbook-replay.mjs";
import { workbookOption } from "../lib/voxel-workbook.ts";

const [id, sdlDirectory] = process.argv.slice(2);
const option = workbookOption(id);
const project = loadProjectCatalog().find((p) => p.id === id && option);
if (!project || !sdlDirectory || !existsSync(path.join(sdlDirectory, "SDL3Config.cmake")))
  throw Error(
    "Usage: node --experimental-strip-types scripts/verify-voxel-workbook.mjs <11|31|52..64> <installed SDL3 3.4.8 CMake directory>",
  );
const sdl = realpathSync(sdlDirectory);
const archive = path.join(workspace, "public", "downloads", project.sourceDirectory + ".zip");
const lessonDir = path.join(workspace, "content", project.slug);
const lessons = readdirSync(lessonDir)
  .filter((file) => file.endsWith(".mdx"))
  .sort();
const sandbox = path.resolve(workspace, ".validation");
mkdirSync(sandbox, { recursive: true });
const scratch = mkdtempSync(path.join(sandbox, "workbook-" + id + "-"));
const supervisor = new ProcessSupervisor();
const release = installShutdownHandlers(supervisor, "voxel learner verification");
const deadline = Date.now() + 4 * 60_000;
const target = "project_" + id;
const win = process.platform === "win32";
async function run(command, args, label, timeout = 40_000, allowedExitCodes = [0]) {
  const timeoutMs = Math.min(timeout, deadline - Date.now());
  if (timeoutMs <= 0) throw Error("Project verification deadline reached");
  const child = supervisor.start({
    command,
    args,
    cwd: scratch,
    timeoutMs,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let tail = "";
  for (const pipe of [child.stdout, child.stderr])
    pipe.on("data", (chunk) => {
      tail = (tail + chunk.toString()).slice(-5000);
    });
  try {
    await supervisor.wait(child, { label, timeoutMs, allowedExitCodes });
    return tail;
  } catch (err) {
    throw Error(label + "\n" + tail, { cause: err });
  }
}
const configure = (dir, conf) =>
  run(
    "cmake",
    [
      "-S",
      ".",
      "-B",
      dir,
      "-D" + option + "=ON",
      "-DCOURSE_USE_INSTALLED_SDL3=ON",
      "-DSDL3_DIR=" + sdl,
      "-DCMAKE_BUILD_TYPE=" + conf,
    ],
    "configure " + conf,
  );
const build = (dir, conf, suffix) =>
  run(
    "cmake",
    ["--build", dir, "--config", conf, "--target", target + suffix, "--parallel", "1"],
    "build " + suffix,
  );
const workDir = path.join(scratch, "work");
try {
  await run("cmake", ["-E", "tar", "xf", archive], "extract ZIP");
  assert.ok(!existsSync(workDir), "ZIP should never include a learner's work");
  await configure("build-work", "Release");
  const multi = /CMAKE_CONFIGURATION_TYPES:[^=]*=.+/m.test(
    textAt(path.join(scratch, "build-work"), "CMakeCache.txt"),
  );
  const app = path.join(
    scratch,
    "build-work",
    multi ? "Release" : "",
    target + "_work" + (win ? ".exe" : ""),
  );
  const learner = snapshot(workDir);
  let previous = snapshot(path.join(scratch, "starter"));
  assert.deepEqual(learner, previous);
  await build("build-work", "Release", "_work");
  const flags = ["52", "53", "54"].includes(id) ? ["--frames", "3"] : ["--smoke"];
  if (id === "53" || id === "54") flags.push("--hidden");
  const observed =
    option === "COURSE_WORKBOOK"
      ? /SDL smoke PASS|Completed 3 frame|"frames":3|frames=3/
      : /PASS native frame:/;
  assert.match(await run(app, flags, "starter", 15000), observed);
  for (const [index, file] of lessons.entries()) {
    const step = index + 1;
    const changed = workPaths(textAt(lessonDir, file), id, step);
    const after = snapshot(path.join(scratch, "checkpoints", String(step).padStart(2, "0")));
    replayLesson(learner, previous, after, changed);
    for (const name of changed) writeFileSync(path.join(workDir, name), learner.get(name) + "\n");
    if (step === 1) {
      // A second configure must not silently replace today's edits with starter.
      await configure("build-work", "Release");
      assert.deepEqual(snapshot(workDir), learner);
    }
    await build("build-work", "Release", "_work");
    const smoke = await run(app, flags, "run learner step " + step, 15_000);
    assert.match(smoke, observed);
    if (id === "58" && step === 1) assert.match(smoke, /1 blocks, 6 quads/);
    console.log(id + "." + step + " " + smoke.trim().split("\n").at(-1));
    previous = after;
  }
  assert.deepEqual(snapshot(workDir), snapshot(path.join(scratch, "final")));
  for (const conf of ["Release", "Debug"]) {
    const dir = conf === "Release" || multi ? "build-work" : "build-work-debug";
    if (dir !== "build-work") await configure(dir, conf);
    await build(dir, conf, "_tests");
    assert.match(
      await run(
        "ctest",
        ["--test-dir", dir, "-C", conf, "--output-on-failure", "--timeout", "30"],
        "CTest " + conf,
      ),
      /100% tests passed/,
    );
  }
  const mistake = {
    11: [
      "include/lab.hpp",
      "cameraPoint.x / cameraPoint.z",
      "cameraPoint.x",
      "wrong perspective divisor",
    ],
    31: [
      "include/tree.hpp",
      "if (sourceIndex == targetIndex)",
      "if (false)",
      "counting the target as its own source",
    ],
    58: ["include/trail/surface.hpp", "face < 6", "face < 5", "five-sided cube"],
  }[id];
  if (mistake) {
    // Only corrupt the disposable learner copy; keep the bundled solution as an independent control.
    const [file, expected, incorrect, label] = mistake;
    const targetFile = path.join(workDir, file);
    const good = readFileSync(targetFile, "utf8");
    const bad = good.replace(expected, incorrect);
    assert.notEqual(bad, good);
    writeFileSync(targetFile, bad);
    await build("build-work", "Release", "_tests");
    const rejected = await run(
      "ctest",
      ["--test-dir", "build-work", "-C", "Release", "--output-on-failure", "--timeout", "30"],
      "reject " + label,
      40_000,
      [8],
    );
    assert.match(rejected, /0% tests passed/);
    if (id === "11") assert.match(rejected, /FAIL: independent analytic pixel/);
    if (id === "31") assert.match(rejected, /FAIL: skip exactly one target ID/);
    assert.equal(textAt(path.join(scratch, "final"), file), good.trimEnd().replaceAll("\r", ""));
    console.log(id + ": " + label + " in work/ rejected; bundled final/ unchanged.");
  }
  console.log(id + ": learner builds and Debug/Release CTest passed.");
} finally {
  release();
  await supervisor.stopAll();
  const root = realpathSync(scratch);
  if (
    path.dirname(root) === realpathSync(sandbox) &&
    path.basename(root).startsWith("workbook-" + id + "-")
  ) {
    rmSync(root, { recursive: true, force: true, maxRetries: 2 });
  } else {
    console.error("Unexpected sandbox for cleanup; leaving directory untouched.");
    process.exitCode = 1;
  }
}
