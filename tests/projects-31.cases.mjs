import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import test from "node:test";
import { compile } from "@mdx-js/mdx";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import { isContiguousCodeExcerpt, codeTokens } from "../scripts/code-snippets.mjs";
import { workspace, render } from "./site-support.mjs";
const content = path.join(workspace, "content/barnes-hut-nbody");
const root = path.join(workspace, "examples/project-31-barnes-hut-nbody");

test("Project 31 JSON imports follow source content even when examples is not watched", async () => {
  for (const name of [
    "starter",
    ...Array.from({ length: 10 }, (_, i) => String(i + 1)),
    "final",
    "common",
  ]) {
    const generatedModule = await readFile(
      path.join(workspace, "lib/generated-checkpoint-sources/p31", name + ".ts"),
      "utf8",
    );
    const payloadName = generatedModule.match(/from "\.\/data\/([^"/]+\.json)"/)?.[1];
    assert.ok(payloadName, name);
    assert.doesNotMatch(generatedModule, /&raw/);
    const bytes = await readFile(
      path.join(workspace, "lib/generated-checkpoint-sources/p31/data", payloadName),
    );
    assert.equal(
      payloadName.split(".")[1],
      createHash("sha256").update(bytes).digest("hex").slice(0, 16),
    );
    assert.ok(
      bytes.equals(await readFile(path.join(workspace, "public/project-sources/31", payloadName))),
    );
    const payload = JSON.parse(bytes);
    assert.equal(payload.schemaVersion, 1);
    for (const file of payload.files) {
      const directory =
        name === "common"
          ? ""
          : name === "starter" || name === "final"
            ? name
            : "checkpoints/" + name.padStart(2, "0");
      assert.equal(file.source, await readFile(path.join(root, directory, file.path), "utf8"));
    }
  }
});
test("Project 31 teaches ten complete source-aligned lessons with highlighted code", async () => {
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  assert.equal(files.length, 10);
  const catalog = JSON.parse(await readFile(path.join(workspace, "course/projects.json"), "utf8"));
  assert.equal(catalog.find((project) => project.id === "31").checkpointCount, 10);
  for (const [index, file] of files.entries()) {
    const mdx = await readFile(path.join(content, file), "utf8");
    let examples = 0;
    for (const [, title, code] of mdx.matchAll(
      /\x60\x60\x60cpp title="([^"]+)"\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g,
    )) {
      const relative = title.split(" — ")[0],
        source = await readFile(
          relative.startsWith("tests/")
            ? path.join(root, relative)
            : path.join(root, "checkpoints", String(index + 1).padStart(2, "0"), relative),
          "utf8",
        );
      assert.ok(isContiguousCodeExcerpt(code, source), file + ": " + title);
      const stack = [],
        pairs = { "}": "{", ")": "(", "]": "[" };
      for (const token of codeTokens(code)) {
        if (["{", "(", "["].includes(token)) stack.push(token);
        else if (Object.hasOwn(pairs, token)) assert.equal(stack.pop(), pairs[token], title);
      }
      assert.equal(stack.length, 0, title);
      for (const line of code.split("\n")) assert.equal(line.match(/^ */)[0].length % 4, 0, title);
      examples++;
    }
    assert.ok(examples >= 3, file + " needs explained complete code steps");
    for (const heading of [
      "Vấn đề cần giải quyết",
      "Hiểu ý tưởng trước khi viết code",
      "Viết code từng bước",
      "Ghép các phần lại",
      "Thử làm sai để hiểu đúng",
      "Tự kiểm tra kết quả",
      "Bài tập mở rộng",
    ])
      assert.ok(mdx.includes("## " + heading), file + ": " + heading);
    assert.match(String(await compile(mdx, courseMdxOptions)), /one-dark-pro/);
    assert.doesNotMatch(mdx, /TODO|Checkpoint đang xây|chắc chắn.*nhanh hơn/);
  }
});
test("Project 31 serves overview and every rebuilt lesson with complete source", async () => {
  const overview = await render("/projects/barnes-hut-nbody");
  assert.equal(overview.status, 200);
  const html = await overview.text();
  assert.match(html, /4.096|4096/);
  assert.match(html, /class="lab-readout"/);
  assert.match(html, /THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI/);
  const files = (await readdir(content)).filter((file) => file.endsWith(".mdx")).sort();
  for (const file of files) {
    const response = await render("/projects/barnes-hut-nbody/" + file.slice(0, -4));
    assert.equal(response.status, 200, file);
    const body = await response.text();
    assert.doesNotMatch(
      body.replace(/<[^>]*>/g, ""),
      /const double mass = 0\.35/,
      "Rendered source must not revert to the old galaxy",
    );
    assert.match(body, /one-dark-pro/);
    assert.match(body, /class="lab-readout"/);
    if (file === files.at(-1)) {
      assert.match(body, /Toàn bộ mã nguồn của dự án/);
      assert.match(body, /include\/experiments.hpp/);
      assert.match(body, /project-31-barnes-hut-nbody.zip/);
    }
  }
});
test("Project 31 splits controls/results/measurement kernels into bounded lazy chunks", async () => {
  const directory = path.join(workspace, "dist/client/_next/static/chunks"),
    files = await readdir(directory);
  for (const prefix of ["barnes-hut-nbody-lab-", "galaxy-controls-", "galaxy-results-"]) {
    const file = files.find((file) => file.startsWith(prefix) && file.endsWith(".js"));
    assert.ok(file, prefix);
    assert.ok((await stat(path.join(directory, file))).size < 24 * 1024, file);
  }
  const manifest = JSON.parse(
      await readFile(path.join(workspace, "dist/client/.vite/manifest.json"), "utf8"),
    ),
    entry = manifest["components/labs/barnes-hut-nbody-lab.tsx"];
  for (const file of [
    "components/labs/galaxy-controls.tsx",
    "components/labs/galaxy-results.tsx",
    "lib/labs/galaxy/jobs.ts",
  ])
    assert.ok(entry.dynamicImports.includes(file), file);
});
