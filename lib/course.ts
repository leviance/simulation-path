import { projectManifestLoaders } from "@/course/generated/project-loaders";
import { publishedProjectSummaries } from "@/course/generated/project-summaries";
import { coursePartTitles, roadmapSeed } from "@/course/roadmap";
import { projectCatalogById } from "@/lib/project-catalog";
import type {
  ComingSoonProjectSummary,
  CoursePart,
  PublishedProjectMeta,
  PublishedProjectSummary,
  ProjectSummary,
} from "@/course/types";

export type {
  ComingSoonProjectSummary,
  CoursePart,
  DemoId,
  LessonMeta,
  ProjectChallenge,
  ProjectMeta,
  ProjectSummary,
  PublishedProjectMeta,
  PublishedProjectSummary,
} from "@/course/types";

const publishedSummaryById = new Map<string, PublishedProjectSummary>(
  publishedProjectSummaries.map((project) => [project.id, project]),
);

export const projects: ProjectSummary[] = roadmapSeed.map((item) => {
  const id = String(item.id).padStart(2, "0");
  const published = publishedSummaryById.get(id);
  if (published) return published;
  const comingSoon: ComingSoonProjectSummary = {
    id,
    slug: `project-${id}`,
    part: item.part,
    title: item.title,
    summary: "Nội dung chi tiết sẽ được biên soạn ở một release tiếp theo.",
    status: "coming-soon",
  };
  return comingSoon;
});

export const courseParts: CoursePart[] = coursePartTitles.map((title) => ({
  title,
  projects: projects.filter((project) => project.part === title),
}));

export const publishedProjects: PublishedProjectSummary[] = projects.filter(
  (project): project is PublishedProjectSummary => project.status === "published",
);

const projectPromiseCache = new Map<string, Promise<PublishedProjectMeta | undefined>>();

export function getProjectSummary(slug: string) {
  return projects.find((project) => project.slug === slug);
}

export function getPublishedProject(slug: string): Promise<PublishedProjectMeta | undefined> {
  const cached = projectPromiseCache.get(slug);
  if (cached) return cached;

  const summary = publishedProjects.find((project) => project.slug === slug);
  const load = projectManifestLoaders[slug];
  if (!summary || !load) return Promise.resolve(undefined);

  const promise = load().then(({ default: editorial }) => {
    const catalog = projectCatalogById.get(summary.id);
    if (!catalog) return undefined;
    return {
      ...summary,
      ...editorial,
      sourceDirectory: catalog.sourceDirectory,
      checkpointCount: catalog.checkpointCount,
    } satisfies PublishedProjectMeta;
  });
  projectPromiseCache.set(slug, promise);
  return promise;
}

export async function getAllPublishedProjects() {
  const loaded = await Promise.all(
    publishedProjects.map((project) => getPublishedProject(project.slug)),
  );
  return loaded.filter((project): project is PublishedProjectMeta => Boolean(project));
}
