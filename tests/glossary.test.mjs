import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import {
  assertGlossaryModules,
  glossaryRegistrySource,
  glossarySources,
  loadGlossaryCatalog,
} from "../scripts/glossary-catalog.mjs";
import { workspace } from "../scripts/project-catalog.mjs";
import { assertSelfContainedModule } from "../scripts/typescript-module-contract.mjs";

async function evaluateModule(file) {
  const source = await readFile(path.join(workspace, file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    fileName: file,
  });
  assertSelfContainedModule(outputText, file);
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

function fixtureModules(changeEntry) {
  return async (file) => {
    const source = glossarySources.find((entry) => entry.file === file);
    const entry = { id: source.name.toLowerCase(), term: source.name, definition: "Definition" };
    return { [source.name]: [changeEntry(entry, source)] };
  };
}

test("glossary catalog rejects duplicate ids and malformed entries", async () => {
  await assert.rejects(
    loadGlossaryCatalog(fixtureModules((entry) => ({ ...entry, id: "duplicate" }))),
    /Duplicate glossary id duplicate/,
  );
  await assert.rejects(
    loadGlossaryCatalog(fixtureModules((entry) => ({ ...entry, definition: " " }))),
    /definition must be a non-empty string/,
  );
  await assert.rejects(
    loadGlossaryCatalog(fixtureModules((entry) => ({ ...entry, id: "invalid anchor" }))),
    /Invalid glossary id/,
  );
  await assert.rejects(
    loadGlossaryCatalog(async () => ({})),
    /must export a non-empty/,
  );
});

test("glossary catalog detects unregistered or missing modules", () => {
  const files = glossarySources.map(({ file }) => file);
  assert.doesNotThrow(() => assertGlossaryModules(files));
  assert.throws(() => assertGlossaryModules([...files, "lib/glossary-future.ts"]), /Unregistered/);
  assert.throws(() => assertGlossaryModules(files.slice(1)), /Missing glossary module/);
});

test("every authored glossary term appears exactly once in search and the page registry", async () => {
  const files = (await readdir(path.join(workspace, "lib")))
    .filter((file) => /^glossary(?:-[a-z-]+)?\.ts$/.test(file))
    .map((file) => `lib/${file}`);
  assertGlossaryModules(files);
  const terms = await loadGlossaryCatalog(evaluateModule);
  const ids = terms.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes("octant") && ids.includes("octant-3d"));
  const searchFiles = (await readdir(path.join(workspace, "course/generated/search"))).filter(
    (file) => /^glossary-\d+\.ts$/.test(file),
  );
  const shards = await Promise.all(
    searchFiles.map((file) => evaluateModule(`course/generated/search/${file}`)),
  );
  const hrefs = shards.flatMap(({ items }) => items.map(({ href }) => href));
  assert.equal(new Set(hrefs).size, hrefs.length, "Duplicate glossary search result");
  assert.deepEqual(hrefs.sort(), ids.map((id) => `/glossary#${id}`).sort());
  const registry = await readFile(path.join(workspace, "course/generated/glossary.ts"), "utf8");
  assert.equal(registry, glossaryRegistrySource());
  const page = await readFile(path.join(workspace, "app/glossary/page.tsx"), "utf8");
  assert.match(page, /import \{ allGlossaryTerms \} from "@\/course\/generated\/glossary"/);
});
