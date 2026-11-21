import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import {
  codeTokens,
  isContiguousCodeExcerpt,
  markedSnippetBlockPattern,
} from "../scripts/code-snippets.mjs";

// Snippet/source matching alone permits a fragment cut across unrelated branches.
// Lessons must also present complete delimiter-balanced statements or definitions.
const directory = new URL("../content/memory-layout-race/", import.meta.url);
const lessons = (await readdir(directory)).filter((file) => file.endsWith(".mdx"));
for (const file of lessons) {
  test(`P32 ${file}: C++ examples have balanced delimiters`, async () => {
    const lesson = await readFile(new URL(file, directory), "utf8");
    const blocks = [...lesson.matchAll(/```cpp([^\n]*)\n([\s\S]*?)```/g)];
    assert.ok(blocks.length >= 3, "Keep substantive source examples");
    assert.equal(
      [...lesson.matchAll(markedSnippetBlockPattern())].length,
      blocks.length,
      "Bind every teaching example to its source marker",
    );
    const checkpoint = Number(file.slice(0, 2));
    const sourceDirectory = new URL(
      `../examples/project-32-memory-layout-race/checkpoints/0${checkpoint}/`,
      import.meta.url,
    );
    const pairs = { ")": "(", "]": "[", "}": "{" };
    for (const [index, block] of blocks.entries()) {
      const sourcePath = block[1].match(/title="([^" ]+\.(?:hpp|cpp))/)?.[1];
      assert.ok(sourcePath, `block ${index + 1}: identify its actual source file`);
      const root = sourcePath.startsWith("tests/")
        ? new URL("../../", sourceDirectory)
        : sourceDirectory;
      const source = await readFile(new URL(sourcePath, root), "utf8");
      assert.ok(
        isContiguousCodeExcerpt(block[2], source),
        `block ${index + 1}: differs from ${sourcePath}`,
      );
      const stack = [];
      for (const token of codeTokens(block[2])) {
        if (["(", "[", "{"].includes(token)) stack.push(token);
        if (Object.hasOwn(pairs, token)) {
          assert.equal(stack.pop(), pairs[token], `block ${index + 1}: unexpected ${token}`);
        }
      }
      assert.deepEqual(stack, [], `block ${index + 1}: incomplete definition`);
    }
  });
}
