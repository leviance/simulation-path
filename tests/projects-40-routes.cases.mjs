import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { render, workspace } from "./site-support.mjs";

test("Project 40 production renders fourteen cloth lessons with actual checkpoint source and Canvas", async () => {
  const lessons = (await readdir(path.join(workspace, "content/cloth-workshop")))
    .filter((file) => file.endsWith(".mdx"))
    .sort();
  assert.equal(lessons.length, 14);
  for (const lesson of lessons) {
    const response = await render("/projects/cloth-workshop/" + lesson.slice(0, -4));
    assert.equal(response.status, 200, lesson);
    const html = await response.text();
    assert.match(html, /Canvas Project 40/, lesson);
    assert.match(html, /checkpoint-source/, lesson);
    assert.match(html, /shiki|highlighted-code/, lesson);
    assert.doesNotMatch(html, /Transform failed|Invalid Character|Unhandled Script Error/, lesson);
    if (lesson.startsWith("14-")) {
      assert.match(html, /project-40-cloth-workshop\.zip/);
      assert.match(html, /ma-hoan-chinh-cua-project/);
    }
  }
  const response = await render("/projects/cloth-workshop");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /id="challenge-40"/);
  assert.match(html, /100\.000 đỉnh động/);
  assert.match(html, /XPBD/);
  assert.match(html, /project-40-cloth-workshop\.zip/);
});

test("retired Project 40 grid routes do not masquerade as cloth lessons", async () => {
  assert.equal((await render("/projects/gpu-spatial-grid-neighbors")).status, 404);
  assert.equal(
    (await render("/projects/gpu-spatial-grid-neighbors/01-khoa-hop-dong-grid-va-neighbor")).status,
    404,
  );
});
