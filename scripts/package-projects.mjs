import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { loadProjectCatalog, workspace } from "./project-catalog.mjs";
import { projectPackageEntries } from "./package-layout.mjs";
import {
  packageManifestSource,
  projectPackageDigest,
  readPackageManifest,
} from "./package-digest.mjs";
import { reconcileGeneratedFiles } from "./generated-files.mjs";

const projects = loadProjectCatalog();
const downloadsDirectory = path.join(workspace, "public", "downloads");
const manifestPath = path.join(downloadsDirectory, "manifest.json");

mkdirSync(downloadsDirectory, { recursive: true });
const previousManifest = readPackageManifest(manifestPath);
const previousDigests = previousManifest.projects ?? {};
const nextDigests = {};
const expectedArchives = new Set();

for (const project of projects) {
  const sourceDirectory = path.join(workspace, "examples", project.sourceDirectory);
  const destination = path.join(downloadsDirectory, `${project.sourceDirectory}.zip`);
  const digest = projectPackageDigest(sourceDirectory);
  nextDigests[project.sourceDirectory] = digest;
  expectedArchives.add(path.basename(destination));
  if (previousDigests[project.sourceDirectory] === digest && existsSync(destination)) {
    process.stdout.write(`Unchanged ${project.sourceDirectory}.zip\n`);
    continue;
  }

  const temporary = `${destination}.${process.pid}.tmp`;
  const packageEntries = projectPackageEntries(sourceDirectory);
  const result = spawnSync(
    process.platform === "win32" ? "cmake.exe" : "cmake",
    ["-E", "tar", "cf", temporary, "--format=zip", "--", ...packageEntries],
    { cwd: sourceDirectory, encoding: "utf8", timeout: 60_000 },
  );

  if (result.error) {
    rmSync(temporary, { force: true });
    throw result.error;
  }

  if (result.status !== 0) {
    rmSync(temporary, { force: true });
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  try {
    renameSync(temporary, destination);
  } catch {
    rmSync(destination, { force: true });
    renameSync(temporary, destination);
  }
  process.stdout.write(`Packaged ${project.sourceDirectory}.zip\n`);
}

for (const file of readdirSync(downloadsDirectory)) {
  if (/^project-\d{2}-.+\.zip$/.test(file) && !expectedArchives.has(file)) {
    rmSync(path.join(downloadsDirectory, file));
    process.stdout.write(`Removed obsolete ${file}\n`);
  }
}

reconcileGeneratedFiles({
  expectedFiles: new Map([[manifestPath, packageManifestSource(nextDigests)]]),
  workspace,
});
