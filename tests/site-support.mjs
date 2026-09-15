import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectCatalog = JSON.parse(
  await readFile(path.join(workspace, "course", "projects.json"), "utf8"),
);
const projectSlugs = projectCatalog.map((project) => project.slug);
const publishedProjectDirectories = projectCatalog.map((project) => project.sourceDirectory);
const projectDirectoryBySlug = new Map(
  projectCatalog.map((project) => [project.slug, project.sourceDirectory]),
);
const expectedLessonCount = projectCatalog.reduce(
  (total, project) => total + project.checkpointCount,
  0,
);
const fixedRoutes = ["/", "/getting-started", "/roadmap", "/downloads", "/glossary"];
const lessonSectionIds = [
  "vấn-đề-cần-giải-quyết",
  "hiểu-ý-tưởng-trước-khi-viết-code",
  "viết-code-từng-bước",
  "ghép-các-phần-lại",
  "thử-làm-sai-để-hiểu-đúng",
  "tự-kiểm-tra-kết-quả",
  "bài-tập-mở-rộng",
  "ma-chay-duoc-sau-bai",
];
const serverPromise = import(new URL("../dist/server/index.js", import.meta.url)).then(
  (module) => module.default,
);
const maxRenderedRouteCacheEntries = 64;
const renderedRoutes = new Map();
let authoredLessonsPromise;

async function render(route = "/") {
  let rendered = renderedRoutes.get(route);
  if (!rendered) {
    rendered = (async () => {
      const server = await serverPromise;
      const response = await server(
        new Request(`http://localhost${route}`, { headers: { accept: "text/html" } }),
      );
      return {
        body: Buffer.from(await response.arrayBuffer()),
        headers: [...response.headers.entries()],
        status: response.status,
        statusText: response.statusText,
      };
    })();
    renderedRoutes.set(route, rendered);
    if (renderedRoutes.size > maxRenderedRouteCacheEntries) {
      const oldestRoute = renderedRoutes.keys().next().value;
      if (oldestRoute !== undefined && oldestRoute !== route) renderedRoutes.delete(oldestRoute);
    }
  }
  const response = await rendered;
  return new Response(Buffer.from(response.body), {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

async function authoredLessons() {
  authoredLessonsPromise ??= (async () => {
    const lessons = [];
    for (const project of projectSlugs) {
      const directory = path.join(workspace, "content", project);
      for (const file of (await readdir(directory))
        .filter((name) => name.endsWith(".mdx"))
        .sort()) {
        lessons.push({ project, file, route: `/projects/${project}/${file.slice(0, -4)}` });
      }
    }
    return lessons;
  })();
  return authoredLessonsPromise;
}

async function walkFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await walkFiles(target)));
    else output.push(target);
  }
  return output;
}

function cppTokens(source) {
  const withoutComments = source.replace(/\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g, " ");
  return (
    withoutComments.match(
      /[A-Za-z_][A-Za-z0-9_]*|\d[\d']*(?:\.\d+)?|==|!=|<=|>=|\+=|-=|\*=|\/=|&&|\|\||::|->|[{}()[\].,;:+\-*/%=<>]/g,
    ) ?? []
  );
}

function isTokenSubsequence(fragment, source) {
  const expected = cppTokens(fragment);
  const actual = cppTokens(source);
  let sourceIndex = 0;
  for (const token of expected) {
    while (sourceIndex < actual.length && actual[sourceIndex] !== token) sourceIndex += 1;
    if (sourceIndex === actual.length) return false;
    sourceIndex += 1;
  }
  return true;
}

export {
  workspace,
  projectCatalog,
  projectSlugs,
  publishedProjectDirectories,
  projectDirectoryBySlug,
  expectedLessonCount,
  fixedRoutes,
  lessonSectionIds,
  render,
  authoredLessons,
  walkFiles,
  isTokenSubsequence,
};
