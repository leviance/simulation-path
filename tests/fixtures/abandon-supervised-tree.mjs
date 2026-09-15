import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessSupervisor } from "../../scripts/process-supervisor.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(directory, "hanging-process-tree.mjs");
const supervisor = new ProcessSupervisor();
const guardedChild = supervisor.start({
  command: process.execPath,
  args: [fixture],
  cwd: directory,
  stdio: ["ignore", "pipe", "ignore"],
  maxRuntimeMs: 30_000,
});

let output = "";
guardedChild.stdout.setEncoding("utf8");
guardedChild.stdout.on("data", (chunk) => {
  output += chunk;
  const newline = output.indexOf("\n");
  if (newline === -1) return;
  const descendantPid = Number(output.slice(0, newline).trim());
  process.stdout.write(`${JSON.stringify({ guardianPid: guardedChild.pid, descendantPid })}\n`);
});

setInterval(() => {}, 1_000);
