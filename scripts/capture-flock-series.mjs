// Usage: node --experimental-strip-types scripts/capture-flock-series.mjs 72 path/to/build/Release
// Use the same published gallery and checkpoint as the lesson; no second catalogue of filenames.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [project, binaryDirectory] = process.argv.slice(2);
if (!/^(6[5-9]|7[0-2])$/.test(project ?? "") || !binaryDirectory)
  throw new Error("Expected project 65–72 and a directory containing the built executables");
const {
  default: { native },
} = await import(`../course/projects/p${project}/lab.ts`);
const publish = fileURLToPath(new URL("./publish-native-still.mjs", import.meta.url));
const argument = {
  order: "overlap",
  inspect: Number(project) === 69 ? "inspector" : "inspect",
  axis: "axes",
  bubble: "trace",
};
for (const [id, take] of Object.entries(native.takes)) {
  const stage = /Bài (\d+)$/.exec(take.source);
  if (!stage && !take.source.endsWith("Bản hoàn chỉnh")) throw new Error(take.source);
  const suffix = stage ? "checkpoint_" + Number(stage[1]) : "final";
  const exe = path.resolve(
    binaryDirectory,
    "project_" + project + "_" + suffix + (process.platform === "win32" ? ".exe" : ""),
  );
  const capture = spawnSync(
    process.execPath,
    [publish, exe, "flock-workbench", take.poster, "--take", argument[id] ?? id],
    {
      timeout: 16_000,
      windowsHide: true,
      stdio: "inherit",
    },
  );
  if (capture.error || capture.status !== 0)
    throw capture.error ?? new Error("Failed to capture " + take.poster);
}
console.log(
  "Captured " + Object.keys(native.takes).length + " native frames for Project " + project + ".",
);
