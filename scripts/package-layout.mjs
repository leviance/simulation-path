import { existsSync } from "node:fs";
import path from "node:path";

const requiredEntries = ["README.md", "CMakeLists.txt", "starter", "checkpoints", "final", "tests"];
const optionalEntries = ["assets", "LICENSE", "LICENSE.md"];

export function projectPackageEntries(projectDirectory) {
  return [
    ...requiredEntries,
    ...optionalEntries.filter((entry) => existsSync(path.join(projectDirectory, entry))),
  ];
}
