export type ResidentAudit = { revision: number; message: string };

export function auditLabel(result: ResidentAudit | null, revision: number) {
  if (result === null) return "Chưa kiểm";
  if (result.revision !== revision) return "Cần kiểm lại — world đã thay đổi.";
  return result.message;
}
