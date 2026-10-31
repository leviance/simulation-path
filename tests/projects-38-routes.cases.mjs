import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { render, workspace } from "./site-support.mjs";

test("Project 38 production renders every new lesson and the complete source/download interface", async () => {
  const directory = path.join(workspace, "content/charged-particle-chamber");
  const lessons = (await readdir(directory)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(lessons.length, 12);
  for (const file of lessons) {
    const response = await render("/projects/charged-particle-chamber/" + file.slice(0, -4));
    assert.equal(response.status, 200, file);
    const html = await response.text();
    assert.match(html, /Canvas Project 38/, file);
    assert.match(html, /checkpoint-source/, file);
    if (file.startsWith("12-")) assert.match(html, /project-38-charged-particle-chamber\.zip/, file);
    assert.doesNotMatch(html, /Unhandled Script Error|Transform failed|Invalid Character/, file);
  }
  const overview = await render("/projects/charged-particle-chamber");
  assert.equal(overview.status, 200);
  const html = await overview.text();
  assert.match(html, /Lorentz/);
  assert.match(html, /Boris/);
  assert.match(html, /1\.000\.000/);
  assert.match(html, /project-38-charged-particle-chamber\.zip/);
});

test("retired Project 38 route is not an alias for the new force model", async () => {
  const response = await render("/projects/five-million-particle-fountain/10-hoan-thien-dai-phun-5-trieu-hat");
  assert.equal(response.status, 404);
});
