import { buildMesh, MeshBuild, type Mesh } from "./mesh.ts";
import {
  minSweepSegments,
  sameSettings,
  usesSweep,
  validateSettings,
  type SurfaceSettings,
} from "./settings.ts";

export function previewSettings(settings: Readonly<SurfaceSettings>): SurfaceSettings {
  let uLimit = 32;
  if (usesSweep(settings.kind)) uLimit = minSweepSegments;
  return {
    ...settings,
    uSegments: Math.min(settings.uSegments, uLimit),
    vSegments: Math.min(settings.vSegments, 16),
  };
}

// The browser owns CPU meshes only. In C++, accepting a full mesh also requires a GPU upload.
export class MeshSession {
  private lastGood: Mesh;
  private preview: Mesh | null = null;
  private candidate: MeshBuild | null = null;
  private requestSettings: SurfaceSettings | null = null;
  private interactive = false;
  private needsPreview = false;
  private builds = 1;
  private publications = 1;
  private message = "";

  constructor(initial: SurfaceSettings) {
    this.lastGood = buildMesh(initial);
  }

  get waitingForRelease() {
    return this.requestSettings !== null && this.interactive && !this.needsPreview;
  }

  get canAdvance() {
    return this.requestSettings !== null && !this.waitingForRelease;
  }

  get previewPending() {
    return this.requestSettings !== null && this.needsPreview;
  }

  read() {
    return {
      displayed: this.preview ?? this.lastGood,
      lastGood: this.lastGood,
      isPreview: this.preview !== null,
      requested: this.requestSettings,
      completedRows: this.candidate?.completedRows ?? 0,
      totalRows: this.requestSettings ? this.requestSettings.uSegments + 1 : 0,
      waitingForRelease: this.waitingForRelease,
      builds: this.builds,
      publications: this.publications,
      message: this.message,
    };
  }

  request(settings: SurfaceSettings, interactive = false) {
    try {
      validateSettings(settings);
    } catch (error) {
      this.reject(error);
      return false;
    }
    if (this.requestSettings && sameSettings(this.requestSettings, settings)) {
      this.interactive = interactive;
      return true;
    }
    this.discardWork();
    this.message = "";
    if (sameSettings(this.lastGood.settings, settings)) return true;
    this.requestSettings = { ...settings };
    this.interactive = interactive;
    this.needsPreview = interactive || !sameSettings(settings, previewSettings(settings));
    return true;
  }

  setInteraction(active: boolean) {
    this.interactive = active && this.requestSettings !== null;
  }

  finishInteraction() {
    this.setInteraction(false);
  }

  advance(): boolean {
    const settings = this.requestSettings;
    if (!settings || this.waitingForRelease) return false;
    try {
      if (this.needsPreview) {
        this.preview = buildMesh(previewSettings(settings));
        ++this.builds;
        this.needsPreview = false;
        return true;
      }
      if (!this.candidate) {
        this.candidate = new MeshBuild(settings);
        ++this.builds;
      }
      this.candidate.advance();
      if (this.candidate.ready) {
        this.lastGood = this.candidate.takeMesh();
        ++this.publications;
        this.discardWork();
      }
    } catch (error) {
      this.reject(error);
    }
    return true;
  }

  cancel() {
    this.discardWork();
    this.message = "Đã hủy; giữ bản đầy đủ gần nhất.";
  }

  private reject(error: unknown) {
    this.discardWork();
    this.message = error instanceof Error ? error.message : "Không dựng được mesh.";
  }

  private discardWork() {
    this.preview = null;
    this.candidate = null;
    this.requestSettings = null;
    this.interactive = false;
    this.needsPreview = false;
  }
}
