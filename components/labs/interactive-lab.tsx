import type { DemoId } from "@/lib/course";
import { labMetadataLoaders } from "@/course/generated/project-loaders";
import { InteractiveLabClient } from "./interactive-lab-client";
import type { InteractiveLabMode } from "./types";

export async function InteractiveLab({ demo, mode }: { demo: DemoId; mode?: InteractiveLabMode }) {
  const load = labMetadataLoaders[demo];
  if (!load) throw new Error(`Unknown Canvas lab: ${demo}`);
  const { default: metadata } = await load();
  return <InteractiveLabClient demo={demo} metadata={metadata} mode={mode} />;
}

export type { InteractiveLabMode } from "./types";
