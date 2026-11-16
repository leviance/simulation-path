import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isContiguousCodeExcerpt, markedCodeExcerpt } from "../scripts/code-snippets.mjs";

const root = path.resolve(import.meta.dirname, "..");
const project = path.join(root, "examples/project-51-sph-water-gpu");
const content = path.join(root, "content/sph-water-gpu");

test("P51 every C++/GLSL teaching block is exactly its marked checkpoint excerpt", async () => {
  const files = (await readdir(content)).filter((name) => /^\d{2}-.+\.mdx$/.test(name)).sort();
  assert.equal(files.length, 12);
  let count = 0;
  for (const file of files) {
    const mdx = await readFile(path.join(content, file), "utf8");
    const blocks = [...mdx.matchAll(/```(?:cpp|glsl) title=/g)];
    const marked = [
      ...mdx.matchAll(
        /\{\/\* snippet ([\w./-]+)#([a-z0-9-]+) \*\/\}\s*```(cpp|glsl) title="([^"]+)"\r?\n([\s\S]*?)\r?\n```/g,
      ),
    ];
    assert.equal(marked.length, blocks.length, file + " has an unmarked teaching block");
    assert.ok(marked.length >= 3, file + " lacks implementation and caller context");
    for (const [, relative, id, language, title, snippet] of marked) {
      assert.equal(title.split(" — ")[0], relative);
      assert.equal(language === "glsl", relative.startsWith("shaders/"));
      const source = await readFile(
        path.join(project, "checkpoints", file.slice(0, 2), relative),
        "utf8",
      );
      assert.equal(snippet, markedCodeExcerpt(source, id), file + "#" + id);
      assert.ok(isContiguousCodeExcerpt(snippet, source), file + "#" + id);
      assert.doesNotMatch(snippet, /Đoạn mã được đồng bộ/);
      count++;
    }
  }
  assert.ok(count >= 45);
});

test("P51 learning metadata describes the real renderer and finite benchmark", async () => {
  const read = (file) => readFile(path.join(root, file), "utf8");
  const guides = await read("course/projects/p51/learning.ts");
  assert.doesNotMatch(guides, /orthographic|Stride giới hạn|B chạy đúng 8 tick|Phím 1–4/);
  const lesson10 = await read("content/sph-water-gpu/10-fence-va-ngan-sach.mdx");
  assert.match(lesson10, /30 warm-up/);
  assert.match(lesson10, /median/);
  assert.match(lesson10, /CPU enqueue/);
  assert.match(lesson10, /20 s/);
  const final = await read("content/sph-water-gpu/12-kiem-chung-va-hoan-thien.mdx");
  for (const option of [
    "--verify-gpu",
    "--tail-case",
    "--verify-acoustic",
    "--verify-force",
    "--verify-perturbed",
    "--verify-scan",
    "--scale-check",
    "--benchmark",
  ])
    assert.ok(final.includes(option), option);
  assert.match(final, /110\.592/);
  assert.match(final, /không chứng nhận solver nước/);
});

test("P51 native workload/render counters, diagnostic timing and oracle budgets stay explicit", async () => {
  const read = (file) => readFile(path.join(project, "final", file), "utf8");
  const main = await read("src/main.cpp");
  assert.match(main, /plan = makePlan\(48\)/);
  assert.match(main, /controls\.serviceRequests/);
  assert.ok(main.indexOf("engine.poll(gl)") < main.indexOf("SDL_PollEvent"));
  const view = await read("include/view.hpp");
  assert.match(view, /stride_ = requireUniform\(gl, program_, "uStride"\)/);
  assert.match(view, /Uniform1ui\(stride_, 1\)/);
  assert.match(view, /drawn = storage\.plan\.count/);
  assert.match(view, /DrawArrays\(GL_POINTS, 0, static_cast<GLsizei>\(drawn\)\)/);
  assert.match(await read("shaders/particle.frag"), /gl_FragDepth/);
  assert.match(
    await read("include/engine.hpp"),
    /lastDiagnostics\.updated\(\) != storage\.plan\.count/,
  );
  assert.match(await read("include/storage.hpp"), /Readback oracle capped at 512/);
  assert.match(await read("include/storage.hpp"), /vertexBlocks < 3/);
  assert.match(await read("include/queue.hpp"), /ClientWaitSync\(fence_, 0, 0\)/);
  const queue = await read("include/queue.hpp");
  assert.equal((queue.match(/throw GpuBatchError\(/g) ?? []).length, 2);
  for (const handler of ["include/controls.hpp", "include/oracle-run.hpp"]) {
    assert.match(
      await read(handler),
      /catch \(const GpuBatchError&\) \{\s*(?:\/\/[^\n]*\n\s*)?throw;\s*\} catch \(const std::exception& error\)/,
      handler + " must not swallow a fatal GPU failure",
    );
  }
  const fatalExit = main.slice(main.lastIndexOf("catch (const std::exception& error)"));
  assert.match(fatalExit, /failed = true;/);
  assert.match(fatalExit, /engine\.destroy\(gl\)/);
  assert.match(fatalExit, /if \(failed\)\s*return EXIT_FAILURE;/);
  assert.doesNotMatch(fatalExit, /engine\.submit\(|while \(|continue;/);
  assert.doesNotMatch(main, /glFinish|measuredMs \/ 8/);
});
