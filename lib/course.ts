import { projectManifestLoaders } from "@/course/generated/project-loaders";
import { publishedProjectSummaries } from "@/course/generated/project-summaries";
import { coursePartTitles, roadmapSeed } from "@/course/roadmap";
import { roadmapRevisions } from "@/course/roadmap-revisions";
import { projectCatalogById } from "@/lib/project-catalog";
import { buildRoadmap } from "@/lib/roadmap-state";
import type {
  CoursePart,
  PublishedProjectMeta,
  PublishedProjectSummary,
  ProjectSummary,
  RevisedProjectSummary,
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
  RevisedProjectSummary,
} from "@/course/types";

export const projects: ProjectSummary[] = buildRoadmap(
  roadmapSeed,
  publishedProjectSummaries,
  roadmapRevisions,
);

export const courseParts: CoursePart[] = coursePartTitles.map((title) => ({
  title,
  projects: projects.filter((project) => project.part === title),
}));

// Existing routes remain available, including clearly labelled previous editions.
export const publishedProjects: readonly PublishedProjectSummary[] = publishedProjectSummaries;

export const currentProjects = projects.filter(
  (project): project is PublishedProjectSummary => project.status === "published",
);

export const revisedProjects = projects.filter(
  (project): project is RevisedProjectSummary => project.status === "awaiting-rebuild",
);

export function getProjectRevision(id: string) {
  return revisedProjects.find((project) => project.id === id);
}

const projectPromiseCache = new Map<string, Promise<PublishedProjectMeta | undefined>>();

export function getProjectSummary(slug: string) {
  return publishedProjects.find((project) => project.slug === slug);
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
