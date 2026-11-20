export interface LabDescription {
  label: string;
  title: string;
  description: string;
}

export interface NativeTake {
  title: string;
  source: string;
  poster: string;
  video?: string;
  alt: string;
  caption: string;
}

export interface NativeMedia {
  /** Show the captured native result and keep the separate browser experiment available. */
  withDemo?: boolean;
  directory: string;
  takes: Record<string, NativeTake>;
  overview: string[];
  lessons: Record<string, string[]>;
}

export interface ProjectLabMeta {
  base: LabDescription;
  modes: Record<string, Pick<LabDescription, "title" | "description">>;
  native?: NativeMedia;
}
