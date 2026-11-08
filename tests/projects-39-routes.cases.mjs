import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { render, workspace } from "./site-support.mjs";

test("Project 39 production renders every city lesson with source and Canvas", async () => {
  const lessons = (await readdir(path.join(workspace, "content/million-object-city")))
    .filter((file) => file.endsWith(".mdx"))
    .sort();
  assert.equal(lessons.length, 12);
  for (const lesson of lessons) {
    const response = await render("/projects/million-object-city/" + lesson.slice(0, -4));
    assert.equal(response.status, 200, lesson);
    const html = await response.text();
    assert.match(html, /Canvas Project 39/, lesson);
    assert.match(html, /checkpoint-source/, lesson);
    assert.match(html, /shiki|highlighted-code/, lesson);
    assert.doesNotMatch(html, /Transform failed|Invalid Character|Unhandled Script Error/, lesson);
    if (lesson.startsWith("12-")) assert.match(html, /project-39-million-object-city\.zip/);
  }
  const overview = await render("/projects/million-object-city");
  assert.equal(overview.status, 200);
  const html = await overview.text();
  assert.match(html, /id="challenge-39"/);
  assert.match(html, /N≥1\.000\.000 thật xét đủ N trên GPU/);
  assert.match(html, /indirect/);
  assert.match(html, /project-39-million-object-city\.zip/);
  assert.doesNotMatch(html, /Nội dung thuộc bản cũ/);
});

test("the retired Project 39 workbench route is not relabelled as a city tutorial", async () => {
  assert.equal((await render("/projects/gpu-reduction-prefix-sum")).status, 404);
  assert.equal(
    (await render("/projects/gpu-reduction-prefix-sum/01-hai-dau-ra-hai-hop-dong")).status,
    404,
  );
});
