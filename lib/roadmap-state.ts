import type { ProjectRevision, ProjectSummary, PublishedProjectSummary } from "../course/types";

interface RoadmapEntry {
  id: number;
  title: string;
  part: string;
}

// Roadmap describes the intended product; published metadata describes available material.
// Keeping them separate prevents a renamed title from relabelling unrelated lessons or ZIPs.
export function buildRoadmap(
  roadmap: readonly RoadmapEntry[],
  published: readonly PublishedProjectSummary[],
  revisions: Readonly<Record<string, ProjectRevision>>,
): ProjectSummary[] {
  const publishedById = new Map(published.map((project) => [project.id, project]));
  for (const id of Object.keys(revisions)) {
    if (
      !publishedById.has(id) ||
      !roadmap.some((entry) => String(entry.id).padStart(2, "0") === id)
    ) {
      throw new Error(`Roadmap revision ${id} must identify an existing published project`);
    }
  }
  return roadmap.map((entry) => {
    const id = String(entry.id).padStart(2, "0");
    const previous = publishedById.get(id);
    const revision = revisions[id];
    if (previous && revision) {
      return {
        id,
        slug: `project-${id}`,
        title: entry.title,
        part: entry.part,
        summary: revision.summary,
        status: "awaiting-rebuild",
        revision,
        previous,
      };
    }
    if (previous) return previous;
    return {
      id,
      slug: `project-${id}`,
      title: entry.title,
      part: entry.part,
      summary: "Nội dung chi tiết sẽ được biên soạn ở một release tiếp theo.",
      status: "coming-soon",
    };
  });
}
