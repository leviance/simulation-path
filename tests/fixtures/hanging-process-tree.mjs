import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.argv[2] === "child") {
  setInterval(() => {}, 1_000);
} else {
  const descendant = spawn(process.execPath, [fileURLToPath(import.meta.url), "child"], {
    stdio: "ignore",
    windowsHide: true,
  });
  process.stdout.write(`${descendant.pid}\n`);
  setInterval(() => {}, 1_000);
}
