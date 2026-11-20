// Run one native project at a time. Every subprocess has a deadline, including the hidden capture.
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { loadProjectCatalog, workspace } from "./project-catalog.mjs";
import { installShutdownHandlers, ProcessSupervisor } from "./process-supervisor.mjs";

const [id, sdlDirectory, configuration = "Release", ...extra] = process.argv.slice(2);
if (
  !/^5[2-7]$/.test(id) ||
  !sdlDirectory ||
  !["Release", "Debug"].includes(configuration) ||
  extra.length
)
  throw Error(
    "Usage: node scripts/check-science-native.mjs 56 <SDL3Config directory> [Release|Debug]",
  );
const sdl = path.resolve(sdlDirectory);
if (!existsSync(path.join(sdl, "SDL3Config.cmake"))) throw Error("Missing local SDL 3.4.8 package");
const project = loadProjectCatalog().find((entry) => entry.id === id);
const source = path.join(workspace, "examples", project.sourceDirectory);
const build = path.join(workspace, ".validation", "science-" + id);
mkdirSync(build, { recursive: true });
const supervisor = new ProcessSupervisor();
const uninstall = installShutdownHandlers(supervisor, "scientific lab check");
const deadline = Date.now() + 160000;
async function run(command, args, limit) {
  const timeoutMs = Math.min(limit, deadline - Date.now());
  if (timeoutMs <= 0) throw Error("Project deadline reached");
  const child = supervisor.start({
    command,
    args,
    cwd: build,
    timeoutMs,
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const pipe of [child.stdout, child.stderr])
    pipe.on("data", (chunk) => process.stdout.write(chunk));
  await supervisor.wait(child, { label: path.basename(command), timeoutMs });
}
try {
  const base = "project_" + id;
  await run(
    "cmake",
    [
      "-S",
      source,
      "-B",
      build,
      "-DCOURSE_USE_INSTALLED_SDL3=ON",
      "-DSDL3_DIR=" + sdl,
      "-DCMAKE_BUILD_TYPE=" + configuration,
    ],
    45000,
  );
  await run(
    "cmake",
    [
      "--build",
      build,
      "--config",
      configuration,
      "--target",
      base + "_final",
      base + "_tests",
      "--parallel",
      "1",
    ],
    75000,
  );
  await run(
    "ctest",
    ["--test-dir", build, "-C", configuration, "--output-on-failure", "--timeout", "15"],
    22000,
  );
  const executable = process.platform === "win32" ? base + "_final.exe" : base + "_final";
  const multi = path.join(build, configuration, executable);
  const capture = path.join(build, "native-" + configuration + ".png");
  const started = Date.now();
  const options = [];
  if (["52", "53", "54"].includes(id)) options.push("--frames", "3");
  if (["53", "54"].includes(id)) options.push("--hidden");
  const binary = existsSync(multi) ? multi : path.join(build, executable);
  if (id === "54") await run(binary, ["--verify-gpu"], 35000);
  await run(binary, [...options, "--capture", capture], 15000);
  if (
    statSync(capture).mtimeMs < started - 1000 ||
    !readFileSync(capture).subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
  )
    throw Error("The executable must produce a fresh PNG from its own framebuffer");
} finally {
  uninstall();
  await supervisor.stopAll();
}
