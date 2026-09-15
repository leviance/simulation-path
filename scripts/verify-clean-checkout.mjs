import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { workspace, loadProjectCatalog } from "./project-catalog.mjs";
import { isGeneratedCoursePath } from "./git-hygiene.mjs";
import { ProcessSupervisor, installShutdownHandlers } from "./process-supervisor.mjs";

// Export working sources, not HEAD: this also verifies an uncommitted migration.
// Reuse installed dependencies without downloading packages or starting a server.
const npmCli =
  process.env.npm_execpath ??
  path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const validationRoot = path.join(workspace, ".validation");
mkdirSync(validationRoot, { recursive: true });
const cleanRoot = mkdtempSync(path.join(validationRoot, "source-only-"));
const dependencyLink = path.join(cleanRoot, "node_modules");
const supervisor = new ProcessSupervisor();
const removeHandlers = installShutdownHandlers(supervisor, "source-only checkout verification");
const startedAt = Date.now();
const totalTimeoutMs = 10 * 60_000;

function git(directory, args) {
  return execFileSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function outputSignature() {
  const roots = [
    "course/generated",
    "content/generated",
    "content/registry.ts",
    "lib/generated-checkpoint-sources",
    "lib/generated-checkpoint-sources.ts",
    "public/downloads",
    ...loadProjectCatalog({ checkDirectories: false }).flatMap((project) =>
      ["CMakeLists.txt", "starter", "checkpoints", "final"].map(
        (entry) => `examples/${project.sourceDirectory}/${entry}`,
      ),
    ),
  ];
  const signature = new Map();
  function visit(relative) {
    const target = path.join(cleanRoot, relative);
    const info = statSync(target);
    if (info.isDirectory()) {
      for (const entry of readdirSync(target)) visit(`${relative}/${entry}`);
    } else {
      signature.set(relative, {
        hash: createHash("sha256").update(readFileSync(target)).digest("hex"),
        mtimeMs: info.mtimeMs,
      });
    }
  }
  for (const root of roots) visit(root);
  return signature;
}

async function runNpm(script, timeoutMs) {
  const remaining = totalTimeoutMs - (Date.now() - startedAt);
  assert.ok(remaining > 0, "Clean-checkout verification exceeded its 10-minute budget");
  process.stdout.write(`\nSource-only checkout: ${script}\n`);
  await supervisor.run({
    label: `source-only ${script}`,
    command: process.execPath,
    args: [npmCli, "run", script],
    cwd: cleanRoot,
    env: process.env,
    timeoutMs: Math.min(timeoutMs, remaining),
  });
}

try {
  const files = [
    ...new Set(
      git(workspace, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
        .split("\0")
        .filter(Boolean),
    ),
  ].filter((file) => !isGeneratedCoursePath(file));
  for (const file of files) {
    const source = path.join(workspace, file);
    const target = path.resolve(cleanRoot, file);
    assert.ok(target.startsWith(cleanRoot + path.sep), `Unsafe export path: ${file}`);
    if (!existsSync(source)) continue; // A locally deleted authored file must stay deleted.
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
  assert.ok(existsSync(path.join(workspace, "node_modules")), "Run npm ci first");
  symlinkSync(
    path.join(workspace, "node_modules"),
    dependencyLink,
    process.platform === "win32" ? "junction" : "dir",
  );
  git(cleanRoot, ["init", "--quiet"]);
  git(cleanRoot, ["add", "--all"]);
  process.stdout.write(
    `Exported ${files.length} authored files; no generated course outputs copied.\n`,
  );

  await runNpm("predev", 2 * 60_000);
  await runNpm("check:course", 60_000);
  await runNpm("check:git", 15_000);
  await runNpm("typecheck", 2 * 60_000);
  await runNpm("check:packages", 2 * 60_000);
  const first = outputSignature();
  await runNpm("predev", 2 * 60_000);
  assert.deepEqual(
    outputSignature(),
    first,
    "Warm preparation must preserve output bytes and timestamps",
  );
  if (process.argv.includes("--build")) await runNpm("test:site", 8 * 60_000);
  git(cleanRoot, ["diff", "--exit-code"]);
  assert.equal(
    git(cleanRoot, ["ls-files", "--others", "--exclude-standard"]).trim(),
    "",
    "Generation must not create new committable files",
  );
  process.stdout.write(
    `\nClean checkout passed: ${first.size} outputs regenerated; source unchanged; warm preparation rewrote nothing.\n`,
  );
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
} finally {
  removeHandlers();
  await supervisor.stopAll();
  // Detach the dependency junction before deleting only this unique disposable export.
  if (existsSync(dependencyLink)) unlinkSync(dependencyLink);
  const relative = path.relative(validationRoot, cleanRoot);
  assert.ok(/^source-only-[^/\\]+$/.test(relative), "Unsafe verification cleanup target");
  rmSync(cleanRoot, { recursive: true, force: true });
}
