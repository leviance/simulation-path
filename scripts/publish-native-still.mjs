// SDL may open its PNG exclusively on Windows. Vite must only see a closed,
// complete file: render outside public, verify the header and rename on one volume.
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [executable, collection, filename, ...options] = process.argv.slice(2);
if (
  !executable ||
  !/^[a-z0-9-]+$/.test(collection ?? "") ||
  !/^[a-z0-9-]+\.png$/.test(filename ?? "") ||
  options.includes("--capture")
)
  throw new Error(
    "Usage: node scripts/publish-native-still.mjs EXE COLLECTION name.png [native options]",
  );
const scratch = path.join(repo, ".validation");
mkdirSync(scratch, { recursive: true });
const temp = mkdtempSync(path.join(scratch, "native-still-"));
try {
  const png = path.join(temp, "frame.png");
  const child = spawnSync(path.resolve(executable), [...options, "--capture", png], {
    cwd: repo,
    timeout: 12_000,
    windowsHide: true,
    stdio: "inherit",
    env: { ...process.env, SDL_VIDEO_DRIVER: "dummy", SDL_RENDER_DRIVER: "software" },
  });
  if (child.error || child.status !== 0) throw child.error ?? new Error("Native capture failed");
  if (!readFileSync(png).subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")))
    throw new Error("Native capture did not return a PNG");
  const directory = path.join(repo, "public", "field-notes", collection);
  mkdirSync(directory, { recursive: true });
  renameSync(png, path.join(directory, filename));
} finally {
  rmSync(temp, { recursive: true, force: true });
}
