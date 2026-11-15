import assert from "node:assert/strict";
import test from "node:test";
import { isContiguousCodeExcerpt, markedCodeExcerpt } from "../scripts/code-snippets.mjs";

test("strict code excerpts preserve return values, operators and token boundaries", () => {
  assert.equal(isContiguousCodeExcerpt("return;", "return trace;"), false);
  assert.equal(isContiguousCodeExcerpt("return;", "early_return;"), false);
  assert.equal(isContiguousCodeExcerpt("a * b;", "a / b;"), false);
  assert.equal(isContiguousCodeExcerpt("a(); b();", "a(); c(); b();"), false);
  assert.equal(isContiguousCodeExcerpt("", "return trace;"), false);
  assert.equal(isContiguousCodeExcerpt("return trace;", "if (done) { return trace; }"), true);
});

test("strict excerpts ignore formatting/comments but retain string and character literals", () => {
  assert.equal(isContiguousCodeExcerpt("return /* note */ trace;", "return\n trace;"), true);
  assert.equal(isContiguousCodeExcerpt('log("x");', 'log("y");'), false);
  assert.equal(isContiguousCodeExcerpt("axis = 'x';", "axis = 'y';"), false);
  assert.equal(
    isContiguousCodeExcerpt('log("https://example.test");', 'log("https://other.test");'),
    false,
  );
  assert.equal(
    isContiguousCodeExcerpt('log("/* not a comment */");', 'log("/* not a comment */");'),
    true,
  );
});

test("marked excerpts bind an unambiguous checkpoint range and remove nested marker comments", () => {
  const source =
    "// [snippet outer]\n    left();\n    // [snippet inner]\n    right();\n    // [/snippet inner]\n// [/snippet outer]\n";
  assert.equal(markedCodeExcerpt(source, "outer"), "left();\nright();");
  assert.equal(markedCodeExcerpt(source, "inner"), "right();");
  assert.throws(() => markedCodeExcerpt(source, "missing"));
  assert.throws(() => markedCodeExcerpt(source + source, "outer"));
  assert.throws(() =>
    markedCodeExcerpt("// [/snippet reversed]\n// [snippet reversed]\n", "reversed"),
  );
  assert.throws(() => markedCodeExcerpt(source, "../outer"));
  assert.throws(() => markedCodeExcerpt("// [snippet blank]\n\n// [/snippet blank]", "blank"));
});
