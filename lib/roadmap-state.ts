import type { ProjectRevision, ProjectSummary, PublishedProjectSummary } from "../course/types";

interface RoadmapEntry {
  id: number;
  title: string;
  part: string;
}

// Retired lessons do not map one-to-one to a different product. Forward their
// old slug to the new overview, never silently to a lesson with the same ID.
export function replacementForRetiredSlug(
  slug: string,
  revisions: Readonly<Record<string, ProjectRevision>>,
) {
  for (const revision of Object.values(revisions)) {
    if (revision.previousSlug !== slug) continue;
    const replacement = revision.replacement?.slug;
    if (replacement && replacement !== slug) return replacement;
  }
  return undefined;
}

// Roadmap describes the intended product; published metadata describes available material.
// Keeping them separate prevents a renamed title from relabelling unrelated lessons or ZIPs.
export function buildRoadmap(
  roadmap: readonly RoadmapEntry[],
  published: readonly PublishedProjectSummary[],
  revisions: Readonly<Record<string, ProjectRevision>>,
): ProjectSummary[] {
  const publishedById = new Map(published.map((project) => [project.id, project]));
  for (const [id, revision] of Object.entries(revisions)) {
    const publication = publishedById.get(id);
    if (!publication || !roadmap.some((entry) => String(entry.id).padStart(2, "0") === id)) {
      throw new Error(`Roadmap revision ${id} must identify an existing published project`);
    }
    if (revision.replacement && revision.replacement.slug !== publication.slug) {
      throw new Error(`Roadmap revision ${id} replacement must match the published slug`);
    }
  }
  return roadmap.map((entry) => {
    const id = String(entry.id).padStart(2, "0");
    const publication = publishedById.get(id);
    const revision = revisions[id];
    if (publication && revision?.replacement) {
      return {
        ...publication,
        title: entry.title,
        part: entry.part,
        acceptanceNote: revision.replacement.acceptanceNote,
      };
    }
    if (publication && revision) {
      return {
        id,
        slug: `project-${id}`,
        title: entry.title,
        part: entry.part,
        summary: revision.summary,
        status: "awaiting-rebuild",
        revision,
        previous: publication,
      };
    }
    if (publication) return publication;
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
