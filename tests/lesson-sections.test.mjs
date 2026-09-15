import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import rehypeSlug from "rehype-slug";
import { lessonSections, findLessonSection, nodeText } from "../lib/lesson-sections.mjs";
import rehypeLessonSections from "../lib/rehype-lesson-sections.mjs";
import remarkExperimentProtocol from "../lib/remark-experiment-protocol.mjs";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { lessonSectionUsages, mdxProse } from "../scripts/mdx-contracts.mjs";

test("lesson section roles retain their existing public anchors and unique title aliases", () => {
  assert.deepEqual(
    lessonSections.map(({ id }) => id),
    [
      "vấn-đề-cần-giải-quyết",
      "hiểu-ý-tưởng-trước-khi-viết-code",
      "viết-code-từng-bước",
      "ghép-các-phần-lại",
      "thử-làm-sai-để-hiểu-đúng",
      "tự-kiểm-tra-kết-quả",
      "bài-tập-mở-rộng",
    ],
  );
  const titles = new Set();
  for (const section of lessonSections) {
    for (const title of [section.title, ...section.aliases]) {
      assert.equal(titles.has(title), false, `Ambiguous title: ${title}`);
      titles.add(title);
      assert.equal(findLessonSection(title)?.key, section.key);
    }
  }
  assert.equal(findLessonSection("An undeclared heading"), undefined);
});

test("content contracts inspect real H2 sections, not code examples or nested headings", () => {
  const headings = lessonSections.map(({ aliases }) => `## ${aliases[0]}`).join("\n\n");
  const source = `
\`\`\`cpp title="example.cpp"
## Vấn đề cần giải quyết
\`\`\`

### Bài tập mở rộng

> ## Vấn đề cần giải quyết

${headings}
`;
  const usages = lessonSectionUsages(source);
  assert.deepEqual(
    usages.map(({ key }) => key),
    lessonSections.map(({ key }) => key),
  );
  for (const usage of usages) {
    assert.equal(source.slice(usage.start, usage.end), `## ${usage.heading}`);
  }
  // Do not silently deduplicate or sort: the content contract must catch both.
  assert.equal(lessonSectionUsages(`${headings}\n\n## Vấn đề cần giải quyết`).length, 8);
  assert.equal(
    lessonSectionUsages("## Bài tập mở rộng\n\n## Vấn đề cần giải quyết")[0].key,
    "extensions",
  );
  assert.equal(lessonSectionUsages("## A misspelled title").length, 0);
});

test("renamed headings retain their text and old deep links alongside canonical TOC anchors", () => {
  const heading = (title) => ({
    type: "element",
    tagName: "h2",
    properties: {},
    children: [{ type: "text", value: title }],
  });
  for (const section of lessonSections) {
    for (const title of [section.title, ...section.aliases]) {
      const node = heading(title);
      const tree = { type: "root", children: [node] };
      rehypeSlug()(tree);
      const oldId = node.properties.id;
      rehypeLessonSections()(tree);
      assert.equal(nodeText(node), title);
      assert.equal(node.properties.id, section.id);
      assert.equal(node.properties["data-lesson-section"], section.key);
      if (oldId !== section.id) assert.equal(node.children[0].properties.id, oldId);
      else assert.equal(node.children.length, 1);
      const once = structuredClone(tree);
      rehypeLessonSections()(tree);
      assert.deepEqual(tree, once);
    }
  }
  const unrelated = { type: "root", children: [heading("Một ví dụ bổ sung")] };
  const original = structuredClone(unrelated);
  rehypeLessonSections()(unrelated);
  assert.deepEqual(unrelated, original);
  assert.throws(
    () =>
      rehypeLessonSections()({
        type: "root",
        children: [heading("Vấn đề cần giải quyết"), heading("Bài toán của chúng ta")],
      }),
    /Duplicate lesson section: problem/,
  );
});

test("prose checks distinguish escaped newlines from math and code", () => {
  const source =
    'Gradient $\\mathbf{F}=-\\nabla U$.\n\n$$\n\\nabla U\n$$\n\n`\\n`\n\n```cpp\nprintf("\\n");\n```';
  assert.ok(!mdxProse(source).includes("\\n"));
  assert.ok(mdxProse("Đoạn văn thứ nhất.\\nĐoạn văn thứ hai.").includes("\\n"));
});

test("experiment protocol follows every declared H2 title through the real MDX pipeline", async () => {
  const experiments = lessonSections.find(({ key }) => key === "experiments");
  for (const title of [experiments.title, ...experiments.aliases]) {
    const tree = {
      type: "root",
      children: [{ type: "heading", depth: 2, children: [{ type: "text", value: title }] }],
    };
    remarkExperimentProtocol()(tree);
    assert.equal(tree.children[1].type, "blockquote");
    assert.match(nodeText(tree.children[1]), /dự đoán điều sẽ xảy ra/);
    assert.match(nodeText(tree.children[1]), /hoàn tác thay đổi/);
    const nested = { type: "root", children: [{ ...tree.children[0], depth: 3 }] };
    remarkExperimentProtocol()(nested);
    assert.equal(nested.children.length, 1);
    const output = String(
      await compile(`## ${title}\n\n1. Thử lỗi A.\n2. Thử lỗi B.`, courseMdxOptions),
    );
    assert.ok(output.includes(experiments.id));
    assert.ok(output.includes(title));
    assert.ok(output.includes("dự đoán điều sẽ xảy ra"));
    assert.ok(output.includes("hoàn tác thay đổi"));
  }
});
