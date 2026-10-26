import vinext from "vinext";
import { defineConfig } from "vite";
import mdx from "@mdx-js/rollup";
import { courseMdxOptions } from "./lib/mdx-options.mjs";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig({
  server: {
    watch: {
      // These trees contain C++ checkpoints, compiler output and local package
      // caches. Watched generated source modules use content-versioned ?raw
      // imports, so changing a checkpoint does not require watching these trees.
      // Watching tens of thousands of files can starve RSC transport on Windows.
      ignored: [
        "**/.next/**",
        "**/.npm-cache/**",
        "**/.validation/**",
        "**/dist/**",
        "**/examples/**",
        "**/test-results/**",
      ],
      ...(isCodexSeatbeltSandbox ? { useFsEvents: false, usePolling: true } : {}),
    },
  },
  environments: {
    client: { optimizeDeps: { noDiscovery: true } },
    ssr: { optimizeDeps: { noDiscovery: true } },
    rsc: { optimizeDeps: { noDiscovery: true } },
  },
  plugins: [
    {
      ...mdx(courseMdxOptions),
      // Vite 8 runs its Oxc transform before normal-order plugins in dev.
      // MDX must become JavaScript first, including cache-busted HMR requests.
      enforce: "pre" as const,
    },
    vinext(),
    {
      name: "simulation-path:server-deps-on-demand",
      configResolved(config) {
        if (config.command !== "serve") return;
        for (const name of ["ssr", "rsc"] as const) {
          const optimizeDeps = config.environments[name]?.optimizeDeps;
          if (!optimizeDeps) continue;
          optimizeDeps.noDiscovery = true;
          optimizeDeps.include = [];
        }
      },
    },
  ],
});
