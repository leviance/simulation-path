import { loadProjectCatalog } from "./project-catalog.mjs";

const maxProjectsPerShard = 10;
const projects = loadProjectCatalog({ checkDirectories: false });
const shards = [];

for (let offset = 0; offset < projects.length; offset += maxProjectsPerShard) {
  const members = projects.slice(offset, offset + maxProjectsPerShard);
  shards.push({
    id: `${members[0].id}-${members.at(-1).id}`,
    projects: members.map((project) => project.sourceDirectory),
  });
}

process.stdout.write(`shards=${JSON.stringify(shards)}\n`);
