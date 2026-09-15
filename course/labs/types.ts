export interface LabDescription {
  label: string;
  title: string;
  description: string;
}

export interface ProjectLabMeta {
  base: LabDescription;
  modes: Record<string, Pick<LabDescription, "title" | "description">>;
}
