// Inspect the actual generated import graph instead of assuming one JSON import.
// Shard adapters keep JSON attributes static; the facade uses ordinary ESM
// dynamic imports that both Node and the production bundler can resolve.
export function sourceRuntimePayloadNames(moduleSource, readAdapter) {
  const direct = [...moduleSource.matchAll(/from "\.\/data\/([\w.-]+\.json)"/g)].map(
    (match) => match[1],
  );
  if (direct.length > 0) return direct;
  const adapters = [...moduleSource.matchAll(/import\("(\.\/parts\/[\w.-]+\.mjs)"\)/g)];
  return adapters.map(([, name]) => {
    const source = readAdapter(name);
    const adapter = source.match(
      /^import payload from "\.\.\/data\/([\w.-]+\.json)" with \{ type: "json" \};\s*export const files = payload\.files;\s*$/,
    );
    if (!adapter) throw new Error("Unexpected source runtime adapter: " + name);
    return adapter[1];
  });
}
