import { execFileSync } from "node:child_process";

// Keep this policy aligned with .gitignore. It covers future projects without an ID list.
export function isGeneratedCoursePath(file) {
  return (
    /^(?:course\/generated\/|content\/generated\/|lib\/generated-checkpoint-sources\/|public\/downloads\/)/.test(
      file,
    ) ||
    /^(?:content\/registry\.ts|lib\/generated-checkpoint-sources\.ts)$/.test(file) ||
    /^examples\/project-\d{2}-[a-z0-9-]+\/(?:(?:starter|checkpoints|final)\/|CMakeLists\.txt$)/.test(
      file,
    )
  );
}

function trackedFiles(directory) {
  const output = execFileSync("git", ["ls-files", "--cached", "-z"], {
    cwd: directory,
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return output.split("\0").filter(Boolean);
}

export function trackedGeneratedFiles(directory) {
  return trackedFiles(directory).filter(isGeneratedCoursePath);
}

export function isCompiledArtifact(file, header = Buffer.alloc(0)) {
  if (/\.(?:exe|dll|pdb|ilk|o|a|lib|so(?:\.\d+)*|dylib|tsbuildinfo)$/i.test(file)) return true;
  if (!/\.obj$/i.test(file) || header.length < 20) return false;

  // .obj can also be a legitimate Wavefront mesh. Inspect binary signatures,
  // not the extension alone. Read from the Git index, never a replacement on disk.
  const coffMachines = new Set([0x014c, 0x8664, 0x01c0, 0x01c4, 0xaa64]);
  const coff =
    coffMachines.has(header.readUInt16LE(0)) &&
    header.readUInt16LE(2) > 0 &&
    header.readUInt16LE(16) === 0;
  const extendedCoff =
    header.readUInt16LE(0) === 0 &&
    header.readUInt16LE(2) === 0xffff &&
    coffMachines.has(header.readUInt16LE(6));
  const elf = header.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]));
  return coff || extendedCoff || elf;
}

export function trackedCompiledFiles(directory) {
  return trackedFiles(directory).filter((file) => {
    if (isCompiledArtifact(file)) return true;
    if (!/\.obj$/i.test(file)) return false;
    const content = execFileSync("git", ["show", `:${file}`], {
      cwd: directory,
      timeout: 10_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    return isCompiledArtifact(file, content.subarray(0, 64));
  });
}
