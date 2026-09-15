import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadProjectCatalog, workspace } from "./project-catalog.mjs";
import {
  projectPackageDigest,
  projectPackageFiles,
  readPackageManifest,
} from "./package-digest.mjs";

function walkFiles(directory, prefix = "") {
  const output = [];
  for (const entry of readdirSync(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(directory, relative));
    else if (entry.isFile()) output.push(relative);
  }
  return output.sort((left, right) => left.localeCompare(right));
}

const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "simulation-path-packages-"));
const manifestPath = path.join(workspace, "public", "downloads", "manifest.json");
const manifest = readPackageManifest(manifestPath);
const manifestDigests = manifest.projects ?? {};
const projects = loadProjectCatalog();
let failures = 0;
try {
  for (const project of projects) {
    const sourceDirectory = path.join(workspace, "examples", project.sourceDirectory);
    const archive = path.join(workspace, "public", "downloads", `${project.sourceDirectory}.zip`);
    const digest = projectPackageDigest(sourceDirectory);
    if (manifestDigests[project.sourceDirectory] !== digest) {
      failures += 1;
      process.stderr.write(
        `${project.sourceDirectory}.zip has a stale or missing manifest digest.\n`,
      );
    }
    const extracted = path.join(temporaryRoot, project.sourceDirectory);
    mkdirSync(extracted, { recursive: true });
    const result = spawnSync(
      process.platform === "win32" ? "cmake.exe" : "cmake",
      ["-E", "tar", "xf", archive],
      { cwd: extracted, encoding: "utf8", shell: false, timeout: 30_000 },
    );
    if (result.error) {
      failures += 1;
      process.stderr.write(`Cannot extract ${path.basename(archive)}: ${result.error.message}\n`);
      continue;
    }
    if (result.status !== 0) {
      failures += 1;
      process.stderr.write(
        `Cannot extract ${path.basename(archive)}: ${result.stderr || result.stdout}\n`,
      );
      continue;
    }
    const expectedFiles = projectPackageFiles(sourceDirectory);
    const actualFiles = walkFiles(extracted);
    if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
      failures += 1;
      process.stderr.write(
        `${project.sourceDirectory}.zip has a different file list from its source directory.\n`,
      );
      continue;
    }
    for (const relativePath of expectedFiles) {
      const expected = readFileSync(path.join(sourceDirectory, relativePath));
      const actual = readFileSync(path.join(extracted, relativePath));
      if (!actual.equals(expected)) {
        failures += 1;
        process.stderr.write(`${project.sourceDirectory}.zip is stale at ${relativePath}.\n`);
      }
    }
  }
  const expectedManifestKeys = projects.map((project) => project.sourceDirectory).sort();
  const actualManifestKeys = Object.keys(manifestDigests).sort();
  if (JSON.stringify(actualManifestKeys) !== JSON.stringify(expectedManifestKeys)) {
    failures += 1;
    process.stderr.write("public/downloads/manifest.json does not match the project catalog.\n");
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

if (failures > 0) process.exit(1);
process.stdout.write("All project ZIP files match their source directories.\n");
