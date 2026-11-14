import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { isDisplayableCourseFile } from "../scripts/course-file-types.mjs";
import { sourceRuntimePayloadNames } from "./source-runtime-support.mjs";

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
        const sourceModule = await readFile(path.join(generated, key + ".mjs"), "utf8");
        assert.doesNotMatch(sourceModule, /&raw/);
        assert.ok(sourceModule.includes(`export const version = "${name.split(".")[1]}"`));
        const payload = JSON.parse(bytes);
        assert.equal(payload.schemaVersion, 1);
        const files = payload.files;
        assert.ok(Array.isArray(files));
        const runtimeImports = sourceRuntimePayloadNames(sourceModule, (name) =>
          readFileSync(path.join(generated, name), "utf8"),
        );
        assert.ok(
          runtimeImports.length > 0,
          "runtime must import its data, not just declare a type",
        );
        if (runtimeImports.length > 1) {
          assert.match(sourceModule, /await Promise\.all\(/);
          assert.doesNotMatch(
            sourceModule,
            /import \w+ from/,
            "static imports would merge shards into one production chunk",
          );
          assert.doesNotMatch(
            sourceModule,
            /import\([^\n]+with:/,
            "keep JSON attributes inside static shard adapters",
          );
        }
        const runtimeFiles = [];
        for (const runtimeName of runtimeImports) {
          assert.ok(
            runtimeName.startsWith(key + ".") && runtimeName.endsWith(name.split(".")[1] + ".json"),
          );
          const runtimeBytes = await readFile(path.join(generated, "data", runtimeName));
          assert.ok(runtimeBytes.length <= 128 * 1024, project.id + "/" + runtimeName);
          const shard = JSON.parse(runtimeBytes);
          assert.equal(shard.schemaVersion, 1);
          runtimeFiles.push(...shard.files);
        }
        assert.deepEqual(
          runtimeFiles,
          files,
          "bounded runtime imports must retain every source file in order",
        );
        assert.equal(new Set(files.map((file) => file.path)).size, files.length);
        await Promise.all(
          files.map(async (file) => {
            assert.equal(typeof file.path, "string");
            assert.equal(typeof file.source, "string");
            assert.ok(
              ["bash", "cmake", "cpp", "glsl", "diff", "markdown", "text"].includes(file.language),
            );
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

test(
  "source runtime declarations keep payload JSON out of typechecking without weakening the API",
  { timeout: 15000 },
  async () => {
    const ts = await import("typescript");
    const root = await mkdtemp(path.join(workspace, ".validation/source-payload-types-"));
    try {
      const entry = path.join(root, "consumer.ts");
      await writeFile(
        entry,
        [
          'import { files, version } from "@/lib/generated-checkpoint-sources/p44/final.mjs";',
          "const paths: string[] = files.map(file => file.path);",
          "const content: string = files[0].source;",
          "const revision: string = version;",
          "// @ts-expect-error files is readonly, not an untyped mutable array",
          'files.push({ path: "bad", language: "cpp", source: "" });',
          "// @ts-expect-error language retains its supported-language union",
          'const invalid: typeof files[number] = { path: "bad", language: "unsupported", source: "" };',
          "void [paths, content, revision, invalid];",
        ].join("\n"),
      );
      const program = ts.createProgram([entry], {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        types: [],
        paths: { "@/*": [path.join(workspace, "*")] },
      });
      assert.deepEqual(
        ts
          .getPreEmitDiagnostics(program)
          .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")),
        [],
      );
      const inputs = program.getSourceFiles();
      assert.ok(inputs.some((file) => file.fileName.endsWith("/p44/final.d.mts")));
      assert.equal(
        inputs.filter(
          (file) =>
            file.fileName.includes("/generated-checkpoint-sources/") &&
            file.fileName.endsWith(".json"),
        ).length,
        0,
      );

      const directory = path.join(workspace, "lib/generated-checkpoint-sources/p44");
      const runtime = await import(pathToFileURL(path.join(directory, "final.mjs")).href);
      const manifest = JSON.parse(
        await readFile(path.join(workspace, "public/project-sources/44/manifest.json"), "utf8"),
      );
      const payloadName = path.basename(manifest.snapshots.final);
      const payload = JSON.parse(await readFile(path.join(directory, "data", payloadName), "utf8"));
      assert.deepEqual(runtime.files, payload.files);
      assert.equal(runtime.version, payloadName.split(".")[1]);
    } finally {
      assert.equal(path.dirname(root), path.join(workspace, ".validation"));
      assert.ok(path.basename(root).startsWith("source-payload-types-"));
      await rm(root, { recursive: true, force: true });
    }
  },
);
