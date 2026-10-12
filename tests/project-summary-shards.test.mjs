import assert from "node:assert/strict";
import test from "node:test";
import { projectSummaryModules } from "../scripts/project-summary-shards.mjs";

test("project summary shards retain 78 projects in order with bounded UTF-8 files", () => {
  const summaries = Array.from({ length: 78 }, (_, index) => ({
    id: String(index + 1).padStart(2, "0"),
    summary: "Một bài học tiếng Việt tự nhiên. ".repeat(15),
  }));
  const modules = projectSummaryModules(summaries);
  const found = [];
  for (const [file, source] of modules) {
    assert.ok(Buffer.byteLength(source) <= 16 * 1024, file);
    if (file.startsWith("summaries/")) {
      const ids = [...source.matchAll(/"id": "(\d+)"/g)].map((match) => match[1]);
      assert.ok(ids.length > 0 && ids.length <= 10);
      found.push(...ids);
    }
  }
  assert.deepEqual(
    found,
    summaries.map((summary) => summary.id),
  );
  assert.equal(
    (modules.get("project-summaries.ts").match(/import \{ summaries/g) ?? []).length,
    modules.size - 1,
  );
});
test("oversized individual summaries fail clearly while an empty catalog remains valid", () => {
  assert.throws(
    () => projectSummaryModules([{ id: "01", summary: "Nhiệt độ ".repeat(4000) }]),
    /Project 01 summary exceeds/,
  );
  const modules = projectSummaryModules([]);
  assert.equal(modules.size, 1);
  assert.match(modules.get("project-summaries.ts"), /publishedProjectSummaries = \[/);
});
