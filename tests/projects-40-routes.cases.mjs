import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { render, workspace } from "./site-support.mjs";

test("the homepage features Project 40 as a current guide with acceptance still pending", async () => {
  const home = await (await render("/")).text();
  const cards = home.match(/<a\b[^>]*\bclass="project-card"[^>]*>[\s\S]*?<\/a>/g) ?? [];
  assert.equal(cards.length, 8, "Featuring a replacement must keep the homepage compact");
  const cloth = cards.find((card) => card.includes('href="/projects/cloth-workshop"'));
  assert.ok(cloth, "Project 40 must be directly accessible from the homepage");
  assert.match(cloth, /Xưởng vải 3D/);
  assert.match(cloth.replaceAll("<!-- -->", ""), /P40 · CHỜ NGHIỆM THU/);
  assert.doesNotMatch(home, /href="\/roadmap\/40"/);
});

test("Project 40 appears in the roadmap and current downloads while native acceptance is pending", async () => {
  const roadmap = await (await render("/roadmap")).text();
  const card = roadmap.match(/<a\b[^>]*\bid="project-40"[^>]*>[\s\S]*?<\/a>/)?.[0];
  assert.ok(card, "Project 40 must have a clickable roadmap entry");
  assert.match(card, /href="\/projects\/cloth-workshop"/);
  assert.match(card, /Xưởng vải 3D/);
  assert.match(card.replaceAll("<!-- -->", ""), /14 bài/);
  assert.match(card, /CHỜ NGHIỆM THU/);
  assert.doesNotMatch(card, /CHỜ XÂY DỰNG LẠI/);

  const overview = await (await render("/projects/cloth-workshop")).text();
  assert.match(overview, /aria-label="Chờ nghiệm thu"/);
  assert.match(overview, /chuột trên cửa sổ C\+\+ thật vẫn chờ kiểm trực tiếp/);
  assert.doesNotMatch(overview, /Nội dung thuộc bản cũ|GÓI MÃ NGUỒN BẢN CŨ/);

  const downloads = await (await render("/downloads")).text();
  const previousSection = downloads.indexOf('id="previous-editions"');
  assert.ok(previousSection > 0);
  const zip = 'href="/downloads/project-40-cloth-workshop.zip"';
  assert.ok(downloads.slice(0, previousSection).includes(zip));
  assert.ok(!downloads.slice(previousSection).includes(zip));

  const scope = await render("/roadmap/40");
  assert.equal(scope.status, 307);
  assert.equal(scope.headers.get("location"), "/projects/cloth-workshop");
});

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
