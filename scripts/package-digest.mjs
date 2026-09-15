import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { projectPackageEntries } from "./package-layout.mjs";

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function walkFiles(directory, prefix) {
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(target, relative));
    else if (entry.isFile()) output.push(relative);
  }
  return output;
}

export function projectPackageFiles(projectDirectory) {
  const files = [];
  for (const entry of projectPackageEntries(projectDirectory)) {
    const target = path.join(projectDirectory, entry);
    if (statSync(target).isDirectory()) files.push(...walkFiles(target, entry));
    else files.push(entry);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

export function projectPackageDigest(projectDirectory) {
  const hash = createHash("sha256");
  for (const relativePath of projectPackageFiles(projectDirectory)) {
    hash.update(toPosix(relativePath));
    hash.update("\0");
    hash.update(readFileSync(path.join(projectDirectory, relativePath)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function readPackageManifest(target) {
  if (!existsSync(target)) return {};
  try {
    const value = JSON.parse(readFileSync(target, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function packageManifestSource(digests) {
  return `${JSON.stringify({ version: 1, projects: digests }, null, 2)}\n`;
}
