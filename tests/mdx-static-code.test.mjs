import assert from "node:assert/strict";
import test from "node:test";
import { compile, run } from "@mdx-js/mdx";
import { createElement } from "react";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { courseMdxOptions } from "../lib/mdx-options.mjs";
import rehypeStaticCode from "../lib/rehype-static-code.mjs";
import { packStaticMarkup, unpackStaticMarkup } from "../lib/static-markup.mjs";

const components = {
  CourseStaticMarkup: ({ kind, packed }) =>
    createElement(kind === "code" ? "div" : "span", {
      [kind === "code" ? "data-code-html" : "data-math-html"]: "",
      dangerouslySetInnerHTML: { __html: unpackStaticMarkup(packed) },
    }),
};

test("static code preserves source text and One Dark colors, but removes per-token React objects", async () => {
  const code =
    'int main() {\n    const char* text = "<img src=x onerror=alert(1)>";\n    return 42;\n}\n';
  const source = '```cpp title="src/main.cpp"\n' + code + "```";
  const options = { ...courseMdxOptions, outputFormat: "function-body" };
  const before = await compile(source, {
    ...options,
    rehypePlugins: options.rehypePlugins.filter((plugin) => plugin !== rehypeStaticCode),
  });
  const after = await compile(source, options);
  async function html(compiled) {
    const module = await run(compiled, { ...runtime, baseUrl: import.meta.url });
    return renderToStaticMarkup(createElement(module.default, { components }));
  }
  const original = await html(before),
    compact = await html(after);
  const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  const sourceText = (markup) =>
    markup
      .match(/<code\b[^>]*>([\s\S]*?)<\/code>/)[1]
      .replace(/<[^>]*>/g, "")
      .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) =>
        entity[0] === "#"
          ? String.fromCodePoint(
              Number.parseInt(
                entity.slice(entity[1].toLowerCase() === "x" ? 2 : 1),
                entity[1].toLowerCase() === "x" ? 16 : 10,
              ),
            )
          : entities[entity],
      );
  assert.equal(
    sourceText(compact),
    code.trimEnd(),
    "copy must preserve every character and four-space indentation",
  );
  assert.equal(sourceText(original), sourceText(compact));
  const colors = (markup) =>
    [...markup.matchAll(/style="color:(#[a-f\d]+)/gi)].map((match) => match[1]);
  assert.deepEqual(colors(compact), colors(original), "meaningful token colors must not change");
  assert.match(compact, /data-code-html/);
  assert.match(compact, /one-dark-pro/);
  assert.doesNotMatch(compact, /<img\b/);
  assert.match(String(after), /CourseStaticMarkup/);
  assert.ok(
    String(after).length < String(before).length,
    "compiled/RSC tree must shrink without removing source",
  );
});

test("static code leaves non-code HTML and other themes untouched", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: { "data-theme": "other" },
        children: [{ type: "text", value: "test" }],
      },
    ],
  };
  const original = structuredClone(tree);
  rehypeStaticCode()(tree);
  assert.deepEqual(tree, original);
});

test("static KaTeX keeps inline/display placement, accessible MathML and formula text", async () => {
  const source = "Inline $x < y$ stays in this paragraph.\n\n$$\nE=\\tfrac12mv^2\n$$";
  const options = { ...courseMdxOptions, outputFormat: "function-body" };
  async function html(plugins) {
    const compiled = await compile(source, { ...options, rehypePlugins: plugins });
    const module = await run(compiled, { ...runtime, baseUrl: import.meta.url });
    return {
      compiled: String(compiled),
      html: renderToStaticMarkup(createElement(module.default, { components })),
    };
  }
  const before = await html(options.rehypePlugins.filter((plugin) => plugin !== rehypeStaticCode));
  const after = await html(options.rehypePlugins);
  for (const value of [before, after]) {
    assert.match(value.html, /<p>Inline <span/);
    assert.match(value.html, /stays in this paragraph\.<\/p>/);
    assert.match(value.html, /class="katex-display"/);
    assert.match(value.html, /<math xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/);
    assert.match(value.html, /aria-hidden="true"/);
    assert.match(value.html, /<annotation encoding="application\/x-tex">E=/);
    assert.doesNotMatch(value.html, /<p>Inline <div/);
  }
  const math = (markup) =>
    [...markup.matchAll(/<annotation encoding="application\/x-tex">(.*?)<\/annotation>/g)].map(
      (match) => match[1].replace(/&(?:lt|#x3c);/gi, "<"),
    );
  assert.deepEqual(math(after.html), math(before.html));
  assert.ok(after.compiled.length < before.compiled.length);
});

test("static math does not enable trusted URLs or HTML commands", async () => {
  const compiled = await compile("$\\href{javascript:alert(1)}{x}$", {
    ...courseMdxOptions,
    outputFormat: "function-body",
  });
  const module = await run(compiled, { ...runtime, baseUrl: import.meta.url });
  const markup = renderToStaticMarkup(createElement(module.default, { components }));
  assert.doesNotMatch(markup, /href="javascript:/i);
  assert.doesNotMatch(markup, /<script\b/i);
});

test("static markup tag dictionary round-trips arbitrary text without token collisions", () => {
  for (const html of [
    "",
    "plain < & text",
    '<span title="a > b">Tiếng Việt 🚀 &lt;tag&gt; \u0001 123</span>',
    "<script>not accepted as external input</script>",
  ]) {
    assert.equal(unpackStaticMarkup(packStaticMarkup(html)), html);
  }
  const repeated = '<span style="color:#c678dd">const</span> '.repeat(200);
  const packed = packStaticMarkup(repeated);
  assert.equal(packed.dictionary.length, 2);
  assert.equal(unpackStaticMarkup(packed), repeated);
  assert.ok(JSON.stringify(packed).length < repeated.length / 2);
});
