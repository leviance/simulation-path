import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { workspace, walkFiles } from "./site-support.mjs";
import { isDisplayableCourseFile } from "../scripts/course-file-types.mjs";

// Verify the files the browser actually receives, not obsolete JS chunk names.
export async function assertPublishedProjectSources(id, root) {
  const prefix = `/project-sources/${id}/`;
  async function bytes(url) {
    assert.ok(url.startsWith(prefix));
    const relative = url.slice(1);
    const delivered = await readFile(path.join(workspace, "dist/client", relative));
    assert.ok(
      delivered.equals(await readFile(path.join(workspace, "public", relative))),
      url + " stale build payload",
    );
    return delivered;
  }
  const manifest = JSON.parse(await bytes(prefix + "manifest.json"));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.projectId, id);
  const files = [];
  for (const [key, url] of [
    ["common", manifest.common],
    ["final", manifest.snapshots.final],
  ]) {
    assert.match(url.slice(prefix.length), new RegExp(`^${key}\\.[a-f0-9]{16}\\.json$`));
    const data = await bytes(url);
    assert.equal(
      url.split(".").at(-2),
      createHash("sha256").update(data).digest("hex").slice(0, 16),
    );
    const payload = JSON.parse(data);
    assert.equal(payload.schemaVersion, 1);
    files.push(...payload.files);
  }
  const normalize = (file) => file.split(path.sep).join("/");
  const finalFiles = (await walkFiles(path.join(root, "final"))).map((file) =>
    normalize(path.relative(path.join(root, "final"), file)),
  );
  const testFiles = (await walkFiles(path.join(root, "tests"))).map((file) =>
    normalize(path.relative(root, file)),
  );
  const expected = ["CMakeLists.txt", ...finalFiles, ...testFiles]
    .filter(isDisplayableCourseFile)
    .sort();
  assert.deepEqual(files.map((file) => file.path).sort(), expected, "complete source file set");
  for (const file of files) {
    const source = path.join(
      root,
      file.path === "CMakeLists.txt" || file.path.startsWith("tests/") ? "" : "final",
      file.path,
    );
    assert.equal(file.source, await readFile(source, "utf8"), `${id}/${file.path} source drift`);
  }
  return files;
}
