import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import path from "node:path";
import { codeTokens } from "../scripts/code-snippets.mjs";

const root = new URL("../examples/project-28-boids-spatial-grid/", import.meta.url);
const generator = await readFile(
  new URL("../scripts/generate-checkpoints.mjs", import.meta.url),
  "utf8",
);
const render = vm.runInNewContext(
  generator.slice(
    generator.indexOf("function evaluate("),
    generator.indexOf("function snapshotDefinitions("),
  ) + "\nrenderTemplate",
);
const read = (file) => readFile(new URL(file, root), "utf8");
async function files(directory) {
  const result = [];
  for (const entry of await readdir(new URL(directory, root), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(relative + "/")));
    else result.push(relative);
  }
  return result;
}

test("P28 provided Boids baseline preserves every P27 rule, except the explicit count budget", async () => {
  for (const name of [
    "lab.hpp",
    "flock.hpp",
    "neighbors.hpp",
    "steering.hpp",
    "simulation.hpp",
    "framebuffer.hpp",
  ]) {
    let expected = await readFile(
      new URL("../examples/project-27-boids-2d/source-template/include/" + name, import.meta.url),
      "utf8",
    );
    expected = render(expected, 9, name);
    if (name === "flock.hpp") expected = expected.replaceAll("1024", "10000");
    const actual = render(await read("source-template/include/boids/" + name), 10, name);
    assert.deepEqual(codeTokens(actual), codeTokens(expected), name);
  }
});

test("P28 new native sources stay within file budgets and materialize every staged header", async () => {
  const authored = (await files("source-template/include/")).filter((file) =>
    /\/include\/(?:boids|grid|app)\//.test(file),
  );
  authored.push("tests/boids-grid-cases.hpp");
  for (const file of authored) {
    assert.ok((await stat(new URL(file, root))).size <= 32 * 1024, file);
    const source = await read(file);
    assert.doesNotMatch(source, /TODO|FIXME|Checkpoint đang xây/, file);
    for (const line of source.split(/\r?\n/)) {
      if (line.trim() && !line.trimStart().startsWith("#"))
        assert.equal(line.match(/^ */)[0].length % 4, 0, file + " four-space indentation");
    }
    for (let stage = 0; stage <= 10; stage++) {
      const output = render(source, stage, file);
      assert.doesNotMatch(output, /LAB_CHECKPOINT/, file + " stage " + stage);
    }
  }
  const step = await read("source-template/include/grid/step.hpp");
  assert.doesNotMatch(render(step, 4, "step.hpp"), /job\.grid = buildGrid/);
  assert.match(render(step, 5, "step.hpp"), /job\.grid = buildGrid/);
  assert.doesNotMatch(
    render(step, 7, "step.hpp"),
    /milliseconds\(start, Clock::now\(\)\) >= budgetMs/,
  );
  assert.match(render(step, 8, "step.hpp"), /milliseconds\(start, Clock::now\(\)\) >= budgetMs/);
});
