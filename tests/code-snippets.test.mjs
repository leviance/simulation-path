import assert from "node:assert/strict";
import test from "node:test";
import { isContiguousCodeExcerpt } from "../scripts/code-snippets.mjs";

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
