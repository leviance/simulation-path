import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRenderedRouteCache } from "./rendered-route-cache.mjs";
const root = fileURLToPath(new URL("../.validation", import.meta.url));

test("route cache deduplicates work even if an in-flight response leaves memory", async () => {
  const cache = createRenderedRouteCache(root, 1);
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  try {
    const first = cache.get("/pending", async () => {
      await gate;
      return "first";
    });
    await cache.get("/other", async () => "other");
    const again = cache.get("/pending", async () => {
      throw new Error("must share in-flight work");
    });
    release();
    assert.deepEqual(await Promise.all([first, again]), ["first", "first"]);
  } finally {
    release();
    await cache.dispose();
  }
});

test("route disk cache reuses exact response bytes after bounded memory eviction", async () => {
  const cache = createRenderedRouteCache(root, 1);
  let calls = 0;
  const response = {
    body: Buffer.from("Tiếng Việt\n    int main() {}"),
    headers: [["x-test", "yes"]],
    status: 200,
  };
  try {
    await cache.get("/a", async () => {
      calls++;
      return response;
    });
    await cache.get("/b", async () => {
      calls++;
      return response;
    });
    const restored = await cache.get("/a", async () => {
      throw new Error("must not render twice");
    });
    assert.deepEqual(restored, response);
    assert.equal(calls, 2);
  } finally {
    await cache.dispose();
  }
  await assert.rejects(
    cache.get("/a", async () => response),
    /disposed/,
  );
});

test("route caches isolate runs, deduplicate concurrent reads and do not cache failures", async () => {
  const first = createRenderedRouteCache(root),
    second = createRenderedRouteCache(root);
  let calls = 0;
  try {
    await assert.rejects(
      first.get("/retry", async () => {
        throw new Error("failed render");
      }),
      /failed render/,
    );
    const produce = async () => {
      calls++;
      return { body: Buffer.from("first") };
    };
    const [a, b] = await Promise.all([first.get("/retry", produce), first.get("/retry", produce)]);
    assert.deepEqual(a, b);
    assert.equal(calls, 1);
    assert.equal(
      (await second.get("/retry", async () => ({ body: Buffer.from("second") }))).body.toString(),
      "second",
    );
  } finally {
    await first.dispose();
    await second.dispose();
  }
});
