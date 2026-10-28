import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { codeTokens } from "../scripts/code-snippets.mjs";

const original = new URL("../examples/project-21-obj-mesh-viewer/", import.meta.url);
const viewer = new URL("../examples/project-34-dual-renderer-cube/", import.meta.url);

test("P34 reuses the complete P21 OBJ parser, mesh and normalization semantics", async () => {
  for (const file of ["geometry.hpp", "mesh.hpp", "obj-parser.hpp", "normalize.hpp"]) {
    const expected = await readFile(new URL("final/include/" + file, original), "utf8");
    const actual = await readFile(new URL("source-template/include/obj21/" + file, viewer), "utf8");
    assert.deepEqual(
      codeTokens(actual.replaceAll("namespace obj21", "namespace lab")),
      codeTokens(expected),
      file,
    );
  }
});

test("P34 uses canonical P21 assets once per project, not generated checkpoint copies", async () => {
  for (const file of ["cube.obj", "low-poly-rocket.obj", "faceted-sphere.obj", "LICENSE.txt"]) {
    const expected = await readFile(new URL("assets/" + file, original), "utf8");
    const actual = await readFile(new URL("assets/" + file, viewer), "utf8");
    assert.equal(actual.replaceAll("\r\n", "\n"), expected.replaceAll("\r\n", "\n"), file);
  }
  const sphere = await readFile(new URL("assets/faceted-sphere.obj", viewer), "utf8");
  assert.equal((sphere.match(/^f /gm) ?? []).length, 2976);
});
