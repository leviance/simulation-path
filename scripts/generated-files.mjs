import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

function asBuffer(value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

function sameContents(target, expected) {
  try {
    return readFileSync(target).equals(asBuffer(expected));
  } catch {
    return false;
  }
}

function filesBelow(directory) {
  if (!existsSync(directory)) return [];
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...filesBelow(target));
    else if (entry.isFile()) output.push(target);
  }
  return output;
}

function removeEmptyDirectories(directory, keepRoot = true) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirectories(path.join(directory, entry.name), false);
  }
  if (!keepRoot && readdirSync(directory).length === 0) rmdirSync(directory);
}

export function reconcileGeneratedFiles({
  expectedFiles,
  managedRoots = [],
  checkOnly = false,
  workspace,
}) {
  const expectedTargets = new Set([...expectedFiles.keys()].map((target) => path.resolve(target)));
  let changedCount = 0;
  let removedCount = 0;
  let mismatchCount = 0;

  for (const [target, expected] of expectedFiles) {
    if (sameContents(target, expected)) continue;
    if (checkOnly) {
      mismatchCount += 1;
      process.stderr.write(`Outdated generated file: ${path.relative(workspace, target)}\n`);
      continue;
    }
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, asBuffer(expected));
    changedCount += 1;
  }

  for (const root of managedRoots) {
    for (const target of filesBelow(root)) {
      if (expectedTargets.has(path.resolve(target))) continue;
      if (checkOnly) {
        mismatchCount += 1;
        process.stderr.write(`Unexpected generated file: ${path.relative(workspace, target)}\n`);
      } else {
        rmSync(target);
        removedCount += 1;
      }
    }
    if (!checkOnly) removeEmptyDirectories(root);
  }

  return { changedCount, removedCount, mismatchCount };
}
