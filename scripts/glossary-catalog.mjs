// The page and search index must use the same ordered set of authored modules.
export const glossarySources = [
  { file: "lib/glossary.ts", name: "glossaryTerms" },
  { file: "lib/glossary-depth.ts", name: "depthGlossaryTerms" },
  { file: "lib/glossary-lighting.ts", name: "lightingGlossaryTerms" },
  { file: "lib/glossary-texturing.ts", name: "texturingGlossaryTerms" },
  { file: "lib/glossary-mesh.ts", name: "meshGlossaryTerms" },
  { file: "lib/glossary-physics.ts", name: "physicsGlossaryTerms" },
  { file: "lib/glossary-performance.ts", name: "performanceGlossaryTerms" },
  { file: "lib/glossary-gpu.ts", name: "gpuGlossaryTerms" },
  { file: "lib/glossary-cellular.ts", name: "cellularGlossaryTerms" },
  { file: "lib/glossary-heat.ts", name: "heatGlossaryTerms" },
  { file: "lib/glossary-fields.ts", name: "fieldGlossaryTerms" },
  { file: "lib/glossary-fluids.ts", name: "fluidGlossaryTerms" },
  { file: "lib/glossary-sph.ts", name: "sphGlossaryTerms" },
  { file: "lib/glossary-sph-gpu.ts", name: "sphGpuGlossaryTerms" },
  { file: "lib/glossary-ray-intersections.ts", name: "rayIntersectionGlossaryTerms" },
  { file: "lib/glossary-volume.ts", name: "volumeGlossaryTerms" },
  { file: "lib/glossary-volume-marching.ts", name: "volumeMarchingGlossaryTerms" },
  { file: "lib/glossary-xray.ts", name: "xrayGlossaryTerms" },
  { file: "lib/glossary-ct.ts", name: "ctGlossaryTerms" },
  { file: "lib/glossary-photon.ts", name: "photonGlossaryTerms" },
  { file: "lib/glossary-voxel.ts", name: "voxelGlossaryTerms" },
  { file: "lib/glossary-voxel-faces.ts", name: "voxelFaceGlossaryTerms" },
  { file: "lib/glossary-voxel-picking.ts", name: "voxelPickingGlossaryTerms" },
  { file: "lib/glossary-voxel-greedy.ts", name: "voxelGreedyGlossaryTerms" },
  { file: "lib/glossary-voxel-streaming.ts", name: "voxelStreamingGlossaryTerms" },
  { file: "lib/glossary-voxel-terrain.ts", name: "voxelTerrainGlossaryTerms" },
  { file: "lib/glossary-voxel-sandbox.ts", name: "voxelSandboxGlossaryTerms" },
  { file: "lib/glossary-ui-controls.ts", name: "uiControlGlossaryTerms" },
  { file: "lib/glossary-widget-tree.ts", name: "widgetTreeGlossaryTerms" },
  { file: "lib/glossary-box-layout.ts", name: "boxLayoutGlossaryTerms" },
];

export function assertGlossaryModules(files) {
  const expected = new Set(glossarySources.map(({ file }) => file));
  const actual = new Set(files);
  for (const file of actual) {
    if (!expected.has(file)) throw new Error(`Unregistered glossary module: ${file}`);
  }
  for (const file of expected) {
    if (!actual.has(file)) throw new Error(`Missing glossary module: ${file}`);
  }
}

export async function loadGlossaryCatalog(evaluateModule) {
  const terms = [];
  const owners = new Map();
  for (const { file, name } of glossarySources) {
    const entries = (await evaluateModule(file))[name];
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error(`${file} must export a non-empty ${name} array`);
    }
    for (const entry of entries) {
      if (!entry || typeof entry.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) {
        throw new Error(`Invalid glossary id in ${file}`);
      }
      for (const field of ["term", "definition"]) {
        if (typeof entry[field] !== "string" || entry[field].trim() === "") {
          throw new Error(`${file}: ${entry.id}.${field} must be a non-empty string`);
        }
      }
      if (owners.has(entry.id)) {
        throw new Error(`Duplicate glossary id ${entry.id} in ${owners.get(entry.id)} and ${file}`);
      }
      owners.set(entry.id, file);
      terms.push(entry);
    }
  }
  return terms;
}

export function glossaryRegistrySource() {
  // Import definitions instead of generating another copy of all glossary content.
  const imports = glossarySources.map(
    ({ file, name }) => `import { ${name} } from "../../${file.slice(0, -3)}";`,
  );
  const entries = glossarySources.map(({ name }) => `    ...${name},`);
  return (
    "// Generated from scripts/glossary-catalog.mjs. Do not edit by hand.\n" +
    imports.join("\n") +
    `\n\nexport const allGlossaryTerms = [\n${entries.join("\n")}\n];\n`
  );
}
