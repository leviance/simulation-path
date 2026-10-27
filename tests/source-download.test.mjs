import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fetchProjectSource } from "../lib/source-download.ts";

const root = "/project-sources/32/";
const common = root + "common.aaaaaaaaaaaaaaaa.json";
const final = root + "final.bbbbbbbbbbbbbbbb.json";
const manifest = {
  schemaVersion: 1,
  projectId: "32",
  common,
  snapshots: { final, starter: root + "starter.cccccccccccccccc.json" },
};
function fixture(overrides = {}) {
  const calls = [];
  const responses = {
    [root + "manifest.json"]: manifest,
    [common]: {
      schemaVersion: 1,
      files: [{ path: "CMakeLists.txt", source: "project(fountain)\n" }],
    },
    [final]: {
      schemaVersion: 1,
      files: [{ path: "src/main.cpp", source: "// Đài phun\nint main() { return 0; }\n" }],
    },
    ...overrides,
  };
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (!Object.hasOwn(responses, url)) return new Response("missing", { status: 404 });
    return Response.json(responses[url]);
  };
  return { calls, fetcher };
}
test("source viewer fetches only the requested project/checkpoint and common files", async () => {
  const { calls, fetcher } = fixture();
  assert.equal(
    await fetchProjectSource("32", "final", "src/main.cpp", { fetcher }),
    "// Đài phun\nint main() { return 0; }\n",
  );
  assert.deepEqual(
    calls.map((call) => call.url),
    [root + "manifest.json", common, final],
  );
  assert.equal(calls[0].options.cache, "no-store");
  assert.ok(calls.slice(1).every((call) => call.options.cache === "force-cache"));
  assert.equal(
    await fetchProjectSource("32", "final", "CMakeLists.txt", { fetcher }),
    "project(fountain)\n",
  );
});
test("source viewer refreshes the manifest so changed source uses its new content hash", async () => {
  let version = "bbbbbbbbbbbbbbbb";
  const fetcher = async (url) =>
    url.endsWith("manifest.json")
      ? Response.json({ ...manifest, snapshots: { final: root + "final." + version + ".json" } })
      : Response.json({
          schemaVersion: 1,
          files: [{ path: url === common ? "CMakeLists.txt" : "main.cpp", source: version }],
        });
  assert.equal(
    await fetchProjectSource("32", "final", "main.cpp", { fetcher }),
    "bbbbbbbbbbbbbbbb",
  );
  version = "dddddddddddddddd";
  const urls = [];
  const source = await fetchProjectSource("32", "final", "main.cpp", {
    fetcher: async (url, options) => {
      urls.push(url);
      return fetcher(url, options);
    },
  });
  assert.equal(source, "dddddddddddddddd");
  assert.ok(urls.includes(root + "final.dddddddddddddddd.json"));
});
test("source viewer refuses invalid IDs/checkpoints and cross-project or external payload URLs", async () => {
  for (const [id, checkpoint] of [
    ["../32", "final"],
    ["32", 0],
    ["32", NaN],
    ["32", "__proto__"],
  ]) {
    await assert.rejects(
      fetchProjectSource(id, checkpoint, "main.cpp", {
        fetcher: () => {
          throw Error("must not fetch");
        },
      }),
      /không hợp lệ/,
    );
  }
  for (const url of [
    "https://example.com/source.json",
    "/project-sources/31/common.aaaaaaaaaaaaaaaa.json",
    root + "../common.aaaaaaaaaaaaaaaa.json",
  ]) {
    const { calls, fetcher } = fixture({ [root + "manifest.json"]: { ...manifest, common: url } });
    await assert.rejects(
      fetchProjectSource("32", "final", "main.cpp", { fetcher }),
      /không hợp lệ/,
    );
    assert.equal(calls.length, 1);
  }
});
test("source viewer reports missing checkpoints/files, schema failures and invalid JSON", async () => {
  const cases = [
    { [root + "manifest.json"]: { ...manifest, snapshots: {} } },
    { [root + "manifest.json"]: { ...manifest, projectId: "31" } },
    { [common]: { schemaVersion: 9, files: [] } },
    { [final]: { schemaVersion: 1, files: [{ path: "main.cpp", source: 17 }] } },
  ];
  for (const changed of cases)
    await assert.rejects(fetchProjectSource("32", "final", "main.cpp", fixture(changed)));
  await assert.rejects(
    fetchProjectSource("32", "final", "missing.cpp", fixture()),
    /Không tìm thấy tệp/,
  );
  await assert.rejects(
    fetchProjectSource("32", "final", "main.cpp", {
      fetcher: async () => new Response("<html>error</html>"),
    }),
    /định dạng JSON/,
  );
  await assert.rejects(
    fetchProjectSource("32", "final", "main.cpp", {
      fetcher: async () => new Response("missing", { status: 404 }),
    }),
    /HTTP 404/,
  );
});
test("source viewer has a finite request deadline and respects unmount cancellation", async () => {
  const pending = (_url, options) =>
    new Promise((resolve, reject) => {
      if (options.signal.aborted) reject(options.signal.reason);
      else
        options.signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
    });
  await assert.rejects(
    fetchProjectSource("32", "final", "main.cpp", { fetcher: pending, timeoutMs: 5 }),
    /quá 15 giây/,
  );
  const controller = new AbortController();
  const work = fetchProjectSource("32", "final", "main.cpp", {
    fetcher: pending,
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(work, { name: "AbortError" });
  await assert.rejects(
    fetchProjectSource("32", "final", "main.cpp", { timeoutMs: Infinity }),
    /Giới hạn/,
  );
});
test("source viewer rejects oversized responses before reading the body", async () => {
  await assert.rejects(
    fetchProjectSource("32", "final", "main.cpp", {
      fetcher: async () =>
        new Response("{}", { headers: { "content-length": String(6 * 1024 * 1024) } }),
    }),
    /5 MiB/,
  );
});
test("client source viewer does not import the all-course source graph", async () => {
  const component = await readFile(
    new URL("../components/source-file.tsx", import.meta.url),
    "utf8",
  );
  const loader = await readFile(new URL("../lib/source-download.ts", import.meta.url), "utf8");
  assert.doesNotMatch(component + loader, /generated-checkpoint-sources|project-sources["']/);
  assert.match(component, /request\.current\?\.abort\(\)/);
  for (const name of ["lesson-source-guide.tsx", "lesson-walkthrough.tsx"]) {
    const parent = await readFile(new URL("../components/" + name, import.meta.url), "utf8");
    assert.match(parent, /key=\{`[^`]*sourceVersion[^`]*file\.path/);
  }
});
