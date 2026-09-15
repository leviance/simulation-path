import { spawn } from "node:child_process";
import { terminateProcessTree } from "./process-supervisor.mjs";

const parentPid = Number(process.argv[2]);
const maxRuntimeMs = Number(process.argv[3]);
const command = process.argv[4];
const args = JSON.parse(process.argv[5] ?? "[]");

if (!Number.isInteger(parentPid) || parentPid <= 0 || !command || !Array.isArray(args)) {
  process.stderr.write("guarded-process received invalid launch arguments\n");
  process.exit(2);
}

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
  detached: process.platform !== "win32",
});
let stopping = false;
let runtimeDeadline;

function parentIsAlive() {
  try {
    process.kill(parentPid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

async function stop(exitCode, reason) {
  if (stopping) return;
  stopping = true;
  clearInterval(parentMonitor);
  clearTimeout(runtimeDeadline);
  if (reason) process.stderr.write(`${reason}\n`);
  await terminateProcessTree(child);
  process.exit(exitCode);
}

const parentMonitor = setInterval(() => {
  if (!parentIsAlive()) void stop(143, "Parent process disappeared; cleaned guarded child tree.");
}, 500);

if (Number.isFinite(maxRuntimeMs) && maxRuntimeMs > 0) {
  runtimeDeadline = setTimeout(() => {
    void stop(124, `Guarded process exceeded ${Math.ceil(maxRuntimeMs / 1_000)} seconds.`);
  }, maxRuntimeMs);
}

process.once("SIGINT", () => void stop(130));
process.once("SIGTERM", () => void stop(143));
child.once("error", (error) => void stop(1, error.message));
child.once("exit", (code, signal) => {
  if (stopping) return;
  stopping = true;
  clearInterval(parentMonitor);
  clearTimeout(runtimeDeadline);
  if (signal) process.stderr.write(`Guarded child exited with signal ${signal}.\n`);
  process.exit(code ?? 1);
});
