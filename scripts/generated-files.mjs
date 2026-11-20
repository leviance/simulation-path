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

export function reconcileGeneratedFiles({
  expectedFiles,
  managedRoots = [],
  checkedDirectories = [],
  checkOnly = false,
  workspace,
}) {
  const expectedTargets = new Set([...expectedFiles.keys()].map((target) => path.resolve(target)));
  const checked = new Set([...checkedDirectories].map((directory) => path.resolve(directory)));
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

  // One bottom-up scan both spots stale files and prunes empty folders.
  // Do not re-enumerate every descendant just to discover whether it is empty.
  function reconcileDirectory(directory) {
    let empty = true;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        if (checked.has(target) || !reconcileDirectory(target) || checkOnly) empty = false;
        else rmdirSync(target);
      } else if (!entry.isFile() || expectedTargets.has(target)) {
        empty = false;
      } else if (checkOnly) {
        empty = false;
        mismatchCount += 1;
        process.stderr.write(`Unexpected generated file: ${path.relative(workspace, target)}\n`);
      } else {
        rmSync(target);
        removedCount += 1;
      }
    }
    return empty;
  }
  for (const root of managedRoots) {
    if (existsSync(root)) reconcileDirectory(path.resolve(root));
  }

  return { changedCount, removedCount, mismatchCount };
}
