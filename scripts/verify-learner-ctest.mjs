// Exercise the public ZIP, not the author's source tree or a mock CMake project.
import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { workspace } from "./project-catalog.mjs";
import { ProcessSupervisor, installShutdownHandlers } from "./process-supervisor.mjs";

const sdl = process.argv[2];
if (!sdl || !existsSync(path.join(sdl, "SDL3Config.cmake"))) {
  throw Error("Supply the CMake directory of an installed SDL 3.4.8 (no download).");
}
// MSBuild skips reliable incremental header tracking under the Windows TEMP tree.
const validation = path.join(workspace, ".validation");
mkdirSync(validation, { recursive: true });
const parent = realpathSync(validation);
const root = realpathSync(mkdtempSync(path.join(parent, "learner-ctest-")));
const build = path.join(root, "build");
const guard = new ProcessSupervisor();
const off = installShutdownHandlers(guard);
const deadline = Date.now() + 150_000;
async function command(name, args, expectFailure) {
  const timeoutMs = Math.min(45_000, deadline - Date.now());
  assert.ok(timeoutMs > 0, "Total native verification budget exhausted");
  const options = {
    command: name,
    args,
    cwd: root,
    env: process.env,
    timeoutMs,
    label: name,
    stdio: ["ignore", "pipe", "pipe"],
  };
  const child = guard.start(options);
  let output = "";
  for (const pipe of [child.stdout, child.stderr])
    pipe.on("data", (data) => {
      output = (output + data).slice(-24000);
    });
  const result = await guard.wait(child, { ...options, allowedExitCodes: [0, 1, 2, 8] });
  if (expectFailure) {
    assert.notEqual(result.code, 0, "The incorrect learner implementation passed");
    assert.match(output, expectFailure, output);
  } else assert.equal(result.code, 0, output);
  return output;
}
const configure = (...flags) =>
  command("cmake", [
    "-S",
    root,
    "-B",
    build,
    ...(process.platform === "win32" ? ["-G", "Visual Studio 17 2022", "-A", "x64"] : []),
    "-DCOURSE_USE_INSTALLED_SDL3=ON",
    "-DSDL3_DIR=" + path.resolve(sdl),
    "-DCMAKE_BUILD_TYPE=Release",
    ...flags,
  ]);
const runTarget = (target, failure) =>
  command(
    "cmake",
    ["--build", build, "--config", "Release", "--target", target, "--parallel", "1"],
    failure,
  );
const ctest = (label, failure) =>
  command(
    "ctest",
    ["--test-dir", build, "-C", "Release", "-L", label, "--no-tests=error", "--output-on-failure"],
    failure,
  );
try {
  await command("cmake", [
    "-E",
    "tar",
    "xf",
    path.join(workspace, "public/downloads/project-02-wasd-fps-cap.zip"),
  ]);
  const referencePath = path.join(root, "final/include/lab.hpp");
  const reference = readFileSync(referencePath);
  await configure();
  await runTarget("project_2_tests");
  assert.match(await ctest("reference"), /project_2_final_validation/);
  for (const tree of ["work", "starter"]) {
    const flags = [
      "-DCOURSE_WORKBOOK=" + (tree === "work" ? "ON" : "OFF"),
      "-DCOURSE_TEST_STARTER=" + (tree === "starter" ? "ON" : "OFF"),
    ];
    await configure(...flags);
    if (tree === "work")
      assert.deepEqual(
        readFileSync(path.join(root, "work/src/main.cpp")),
        readFileSync(path.join(root, "starter/src/main.cpp")),
      );
    // An already-built reference/other learner binary must not produce a green result.
    await ctest("learner", new RegExp("project_2_" + tree + "_tests"));
    cpSync(path.join(root, "checkpoints/06/include"), path.join(root, tree, "include"), {
      recursive: true,
    });
    const header = path.join(root, tree, "include/lab.hpp");
    const good = readFileSync(header, "utf8");
    const broken = good.replace("position.x += velocity.x * simulationDt;", "position.x += 0.0;");
    assert.notEqual(broken, good);
    writeFileSync(header, broken);
    await configure(...flags);
    assert.equal(readFileSync(header, "utf8"), broken, "Reconfigure overwrote the learner's work");
    await runTarget("project_2_check_work", /FAILED: 30 FPS travels 900 px/);
    writeFileSync(header, good);
    assert.match(
      await runTarget("project_2_check_work"),
      new RegExp("project_2_" + tree + "_validation"),
    );
    console.log(tree + "/: incorrect movement failed CTest; restored movement passed.");
  }
  assert.deepEqual(readFileSync(referencePath), reference);
  console.log(
    "final/ remained unchanged. Both learner modes and the reference passed independently.",
  );
} finally {
  off();
  await guard.stopAll();
  if (path.dirname(root) === parent && path.basename(root).startsWith("learner-ctest-"))
    rmSync(root, { recursive: true, force: true, maxRetries: 3 });
}
