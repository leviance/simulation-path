import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import mdx from "@mdx-js/rollup";
import { createServer } from "vite";
import { courseMdxOptions } from "../lib/mdx-options.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fullMdxDevCheck = process.env.FULL_MDX_DEV_CHECK === "1";

function withTimeout(promise, timeoutMs, label) {
  let timeout;
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timeout));
}

async function authoredLessons() {
  const projects = JSON.parse(
    await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
  );
  const lessons = [];
  for (const project of projects) {
    const files = (await readdir(path.join(workspace, "content", project.slug)))
      .filter((file) => file.endsWith(".mdx"))
      .sort();
    for (const file of files) {
      lessons.push({
        file,
        sourceUrl: `/content/${project.slug}/${file}?t=mdx-full-regression`,
      });
    }
  }
  return lessons;
}

test(
  "development pipeline compiles representative MDX lessons before Oxc",
  { timeout: fullMdxDevCheck ? 9 * 60_000 : 3 * 60_000 },
  async () => {
    const mdxPlugin = mdx(courseMdxOptions);
    const server = await createServer({
      configFile: false,
      root: workspace,
      plugins: [{ ...mdxPlugin, enforce: "pre" }],
      resolve: { alias: { "@": workspace } },
      optimizeDeps: { noDiscovery: true },
      server: { middlewareMode: true, hmr: false },
      logLevel: "silent",
    });
    try {
      const lessons = await authoredLessons();
      const candidates = fullMdxDevCheck
        ? lessons
        : [
            {
              file: "course-smoke.mdx",
              sourceUrl: "/tests/fixtures/course-smoke.mdx?t=mdx-regression",
            },
          ];
      const concurrency = fullMdxDevCheck ? 4 : 1;
      for (let index = 0; index < candidates.length; index += concurrency) {
        const batch = candidates.slice(index, index + concurrency);
        await Promise.all(
          batch.map(async (lesson) => {
            assert.ok(lesson, "Every development-pipeline fixture must exist");
            const result = await withTimeout(
              server.transformRequest(lesson.sourceUrl),
              90_000,
              `Development transform for ${lesson.file}`,
            );
            assert.ok(result?.code, `Development transform returned no JavaScript: ${lesson.file}`);
            assert.doesNotMatch(result.code, /^# /m, `Raw Markdown reached Oxc: ${lesson.file}`);
            if (!fullMdxDevCheck) {
              assert.match(result.code, /data-course-smoke/);
              assert.match(result.code, /one-dark-pro/);
            }
          }),
        );
      }
    } finally {
      await server.close();
    }
  },
);
