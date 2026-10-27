interface DownloadOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function payloadUrl(value: unknown, projectId: string, key: string) {
  const prefix = `/project-sources/${projectId}/`;
  if (typeof value !== "string" || !value.startsWith(prefix))
    throw new Error("Đường dẫn mã nguồn không hợp lệ.");
  const name = value.slice(prefix.length);
  if (!new RegExp(`^${key}\\.[a-f0-9]{16}\\.json$`).test(name))
    throw new Error("Phiên bản mã nguồn không hợp lệ.");
  return value;
}

export async function fetchProjectSource(
  projectId: string,
  checkpoint: "starter" | number | "final",
  path: string,
  options: DownloadOptions = {},
): Promise<string> {
  if (!/^\d{2}$/.test(projectId)) throw new Error("Project không hợp lệ.");
  if (
    checkpoint !== "starter" &&
    checkpoint !== "final" &&
    !(Number.isInteger(checkpoint) && Number(checkpoint) >= 1 && Number(checkpoint) <= 99)
  )
    throw new Error("Checkpoint không hợp lệ.");
  const key = String(checkpoint);
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000)
    throw new Error("Giới hạn tải mã nguồn không hợp lệ.");
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  async function readJson(url: string, cache: RequestCache) {
    const response = await fetcher(url, { signal: controller.signal, cache });
    if (!response.ok) throw new Error(`Không thể tải mã nguồn (HTTP ${response.status}).`);
    if (Number(response.headers.get("content-length")) > 5 * 1024 * 1024)
      throw new Error("Gói mã nguồn vượt giới hạn 5 MiB.");
    const text = await response.text();
    if (text.length > 5 * 1024 * 1024) throw new Error("Gói mã nguồn vượt giới hạn 5 MiB.");
    return JSON.parse(text) as unknown;
  }
  try {
    // Refresh this small manifest; immutable payload URLs change only when source changes.
    const manifest = await readJson(`/project-sources/${projectId}/manifest.json`, "no-store");
    if (
      !record(manifest) ||
      manifest.schemaVersion !== 1 ||
      manifest.projectId !== projectId ||
      !record(manifest.snapshots) ||
      !Object.hasOwn(manifest.snapshots, key)
    )
      throw new Error("Không tìm thấy checkpoint trong danh mục mã nguồn.");
    const urls = [
      payloadUrl(manifest.common, projectId, "common"),
      payloadUrl(manifest.snapshots[key], projectId, key),
    ];
    const payloads = await Promise.all(urls.map((url) => readJson(url, "force-cache")));
    let source: string | undefined;
    for (const payload of payloads) {
      if (!record(payload) || payload.schemaVersion !== 1 || !Array.isArray(payload.files))
        throw new Error("Gói mã nguồn không đúng định dạng.");
      for (const file of payload.files) {
        if (!record(file) || typeof file.path !== "string" || typeof file.source !== "string")
          throw new Error("Tệp mã nguồn không đúng định dạng.");
        if (file.path === path && source === undefined) source = file.source;
      }
    }
    if (source !== undefined) return source;
    throw new Error(`Không tìm thấy tệp ${path}.`);
  } catch (error) {
    controller.abort(); // Stop the other payload request as well when either one fails.
    if (timedOut) throw new Error("Tải mã nguồn quá 15 giây. Hãy thử mở lại tệp.");
    if (error instanceof SyntaxError) throw new Error("Gói mã nguồn không đúng định dạng JSON.");
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}
