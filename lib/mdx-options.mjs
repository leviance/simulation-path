import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import remarkExperimentProtocol from "./remark-experiment-protocol.mjs";
import rehypeCompactCode from "./rehype-compact-code.mjs";
import rehypeLessonSections from "./rehype-lesson-sections.mjs";

/** @type {import("@mdx-js/rollup").Options} */
export const courseMdxOptions = {
  remarkPlugins: [remarkExperimentProtocol, remarkGfm, remarkMath],
  rehypePlugins: [
    rehypeSlug,
    rehypeLessonSections,
    [rehypeAutolinkHeadings, { behavior: "wrap" }],
    [rehypePrettyCode, { theme: "one-dark-pro", keepBackground: true }],
    rehypeCompactCode,
    rehypeKatex,
  ],
};
