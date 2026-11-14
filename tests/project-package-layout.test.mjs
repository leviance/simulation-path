import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { projectPackageEntries } from "../scripts/package-layout.mjs";
import { projectPackageFiles, projectPackageDigest } from "../scripts/package-digest.mjs";

test("project packages retain scientific references and invalidate the digest when they change", (t) => {
  const tempRoot = path.resolve(os.tmpdir());
  const fixture = mkdtempSync(path.join(tempRoot, "simulation-package-layout-"));
  assert.equal(path.dirname(path.resolve(fixture)), tempRoot);
  assert.ok(path.basename(fixture).startsWith("simulation-package-layout-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  for (const directory of ["starter", "checkpoints", "final", "tests", "source-template", "build"])
    mkdirSync(path.join(fixture, directory));
  for (const file of [
    "README.md",
    "CMakeLists.txt",
    "starter/main.cpp",
    "checkpoints/one.cpp",
    "final/main.cpp",
    "tests/tests.cpp",
  ])
    writeFileSync(path.join(fixture, file), "fixture\n");
  writeFileSync(path.join(fixture, "source-template/author-only.cpp"), "not a snapshot\n");
  writeFileSync(path.join(fixture, "build/compiled.exe"), "not a package input\n");
  const original = projectPackageDigest(fixture);
  assert.ok(!projectPackageEntries(fixture).includes("REFERENCES.md"));
  writeFileSync(
    path.join(fixture, "REFERENCES.md"),
    "Primary formula reference, units and model limits.\n",
  );
  assert.ok(projectPackageEntries(fixture).includes("REFERENCES.md"));
  assert.ok(projectPackageFiles(fixture).includes("REFERENCES.md"));
  const withReferences = projectPackageDigest(fixture);
  assert.notEqual(withReferences, original);
  writeFileSync(path.join(fixture, "REFERENCES.md"), "Corrected formula reference.\n");
  assert.notEqual(projectPackageDigest(fixture), withReferences);
  assert.ok(
    projectPackageFiles(fixture).every((file) => !/^(?:build|source-template)[\\/]/.test(file)),
  );
});
