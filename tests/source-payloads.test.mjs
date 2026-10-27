import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isDisplayableCourseFile } from "../scripts/course-file-types.mjs";

const catalog = JSON.parse(
  await readFile(new URL("../course/projects.json", import.meta.url), "utf8"),
);
const workspace = path.resolve(import.meta.dirname, "..");

test(
  "all published source manifests/payloads are exact, bounded, versioned and shared by server/browser",
  { timeout: 60000 },
  async () => {
    const actualProjects = (await readdir(path.join(workspace, "public/project-sources"))).sort();
    assert.deepEqual(actualProjects, catalog.map((project) => project.id).sort());
    let checked = 0;
    async function checkProject(project) {
      const root = path.join(workspace, "public/project-sources", project.id);
      const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
      assert.equal(manifest.schemaVersion, 1);
      assert.equal(manifest.projectId, project.id);
      const keys = [
        "starter",
        ...Array.from({ length: project.checkpointCount }, (_, index) => String(index + 1)),
        "final",
      ];
      assert.deepEqual(Object.keys(manifest.snapshots).sort(), keys.sort());
      const expectedFiles = ["manifest.json"];
      for (const [key, url] of [
        ["common", manifest.common],
        ...Object.entries(manifest.snapshots),
      ]) {
        const name = url.split("/").at(-1);
        assert.equal(url, `/project-sources/${project.id}/${name}`);
        assert.match(name, new RegExp(`^${key}\\.[a-f0-9]{16}\\.json$`));
        expectedFiles.push(name);
        const bytes = await readFile(path.join(root, name));
        assert.ok(bytes.length <= 5 * 1024 * 1024);
        assert.equal(
          name.split(".")[1],
          createHash("sha256").update(bytes).digest("hex").slice(0, 16),
        );
        const generated = path.join(
          workspace,
          "lib/generated-checkpoint-sources",
          `p${project.id}`,
        );
        assert.ok(bytes.equals(await readFile(path.join(generated, "data", name))));
        const sourceModule = await readFile(path.join(generated, key + ".ts"), "utf8");
        assert.ok(sourceModule.includes(`./data/${name}`));
        assert.doesNotMatch(sourceModule, /&raw/);
        assert.ok(sourceModule.includes(`export const version = "${name.split(".")[1]}"`));
        const payload = JSON.parse(bytes);
        assert.equal(payload.schemaVersion, 1);
        const files = payload.files;
        assert.equal(new Set(files.map((file) => file.path)).size, files.length);
        await Promise.all(
          files.map(async (file) => {
            const snapshot =
              key === "common"
                ? ""
                : key === "starter" || key === "final"
                  ? key
                  : "checkpoints/" + key.padStart(2, "0");
            const source = path.join(
              workspace,
              "examples",
              project.sourceDirectory,
              snapshot,
              file.path,
            );
            if (isDisplayableCourseFile(file.path))
              assert.equal(
                file.source,
                await readFile(source, "utf8"),
                project.id + "/" + key + "/" + file.path,
              );
            else assert.match(file.source, /Asset không hiển thị trong code block/);
          }),
        );
        checked++;
      }
      assert.deepEqual(
        (await readdir(root)).sort(),
        expectedFiles.sort(),
        "no retired hashes left in public output",
      );
    }
    for (let start = 0; start < catalog.length; start += 4)
      await Promise.all(catalog.slice(start, start + 4).map(checkProject));
    assert.ok(checked > 600);
  },
);
