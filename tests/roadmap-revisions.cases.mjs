import assert from "node:assert/strict";
import test from "node:test";
import { roadmapSeed } from "../course/roadmap.ts";
import { roadmapRevisions } from "../course/roadmap-revisions.ts";
import { render, projectCatalog } from "./site-support.mjs";

test("updated roadmap and homepage distinguish planned products from available material", async () => {
  const roadmap = await (await render("/roadmap")).text();
  assert.equal((roadmap.match(/id="project-\d{2}"/g) ?? []).length, 78);
  assert.equal(
    (roadmap.match(/class="roadmap-item is-revised"/g) ?? []).length,
    Object.keys(roadmapRevisions).length,
  );
  assert.equal(
    (roadmap.match(/class="roadmap-item is-live"/g) ?? []).length,
    projectCatalog.length - Object.keys(roadmapRevisions).length,
  );
  assert.ok(roadmap.includes("TOÁN CHO ĐỒ HỌA 3D, GIẢ LẬP VÀ HIỆU NĂNG"));
  assert.ok(!roadmap.includes("MÔ PHỎNG PHÂN TỬ TỪ 2 HẠT TỚI HÀNG TRIỆU HẠT"));
  for (const id of Object.keys(roadmapRevisions)) {
    assert.ok(roadmap.includes(`href="/roadmap/${id}"`));
    assert.ok(roadmap.includes(roadmapSeed[Number(id) - 1].title));
  }
  const home = await (await render("/")).text();
  assert.ok(home.includes("Những thứ bạn sẽ tự tay tạo ra"));
  assert.match(home, /class="floating-label label-a">index = y × width \+ x<\/div>/);
  assert.doesNotMatch(home, /class="floating-label label-a">x = y × width \+ x<\/div>/);
  assert.ok(home.includes("hướng dẫn hiện tại"));
});

test("every revised product has an honest scope page and preserved old overview and lessons", async () => {
  for (const id of Object.keys(roadmapRevisions)) {
    const response = await render(`/roadmap/${id}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(roadmapSeed[Number(id) - 1].title));
    assert.match(html, /CHỜ XÂY DỰNG LẠI/);
    assert.match(html, /chưa phải bài hướng dẫn/);
    assert.match(html, /Quy mô phải kiểm chứng/);
    assert.doesNotMatch(html, /download=""|class="interactive-lab/);
    const source = projectCatalog.find((project) => project.id === id);
    assert.ok(html.includes(`href="/projects/${source.slug}"`));
    const previous = await render(`/projects/${source.slug}`);
    assert.equal(previous.status, 200);
    const previousHtml = await previous.text();
    assert.match(previousHtml, /Nội dung thuộc bản cũ/);
    assert.match(previousHtml, /Tiến độ đã học vẫn được giữ/);
    assert.match(previousHtml, /GÓI MÃ NGUỒN BẢN CŨ/);
    assert.ok(previousHtml.includes(roadmapRevisions[id].previousTitle));
    const lessonLink = [...previousHtml.matchAll(/href="([^"]+)"/g)]
      .map(([, href]) => href)
      .find((href) => href.startsWith(`/projects/${source.slug}/`));
    assert.ok(lessonLink);
    const lesson = await render(lessonLink);
    assert.equal(lesson.status, 200);
    assert.match(await lesson.text(), /Nội dung thuộc bản cũ/);
  }
  assert.equal((await render("/roadmap/99")).status, 404);
  assert.equal((await render("/roadmap/01")).status, 404);
});

test("downloads separate previous ZIPs without deleting or relabelling them as new products", async () => {
  const html = await (await render("/downloads")).text();
  const split = html.indexOf('id="previous-editions"');
  assert.ok(split > 0);
  const current = html.slice(0, split);
  const previous = html.slice(split);
  for (const id of Object.keys(roadmapRevisions)) {
    const source = projectCatalog.find((project) => project.id === id);
    const download = `/downloads/${source.sourceDirectory}.zip`;
    assert.ok(!current.includes(`href="${download}"`));
    assert.ok(previous.includes(`href="${download}"`));
    assert.ok(previous.includes(`href="/roadmap/${id}"`));
  }
  assert.equal((html.match(/download=""/g) ?? []).length, projectCatalog.length);
  assert.match(previous, /Tải ZIP bản cũ/);
});
