import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { serialize, deserialize } from "node:v8";

// Keep only 64 responses in RAM. A per-run disk tier avoids rendering the whole
// course again for the link/payload sweeps after the memory entries are evicted.
export function createRenderedRouteCache(root, memoryLimit = 64) {
  const memory = new Map(),
    files = new Map(),
    active = new Map();
  let directoryPromise,
    disposed = false;
  const directory = () =>
    (directoryPromise ??= (async () => {
      await mkdir(root, { recursive: true });
      return mkdtemp(path.join(root, "rendered-routes-"));
    })());
  async function get(route, produce) {
    if (disposed) throw new Error("Rendered route cache has been disposed");
    let pending = memory.get(route) ?? active.get(route);
    if (!pending) {
      pending = (async () => {
        const file = files.get(route);
        if (file) return deserialize(await readFile(file));
        const response = await produce();
        const target = path.join(
          await directory(),
          createHash("sha256").update(route).digest("hex") + ".bin",
        );
        await writeFile(target, serialize(response));
        files.set(route, target);
        return response;
      })();
      active.set(route, pending);
      void pending.then(
        () => active.delete(route),
        () => active.delete(route),
      );
      memory.set(route, pending);
      if (memory.size > memoryLimit) memory.delete(memory.keys().next().value);
    }
    try {
      return await pending;
    } catch (error) {
      if (memory.get(route) === pending) memory.delete(route);
      throw error;
    }
  }
  async function dispose() {
    disposed = true;
    await Promise.allSettled(active.values());
    memory.clear();
    files.clear();
    if (!directoryPromise) return;
    const target = await realpath(await directoryPromise),
      parent = await realpath(root);
    if (path.dirname(target) !== parent || !path.basename(target).startsWith("rendered-routes-"))
      throw new Error("Refusing to remove a cache outside its dedicated directory");
    await rm(target, { recursive: true, force: true });
  }
  return { get, dispose };
}
