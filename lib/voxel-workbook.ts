/** Only these ZIPs provide the independent VOXEL_WORKBOOK CMake target. */
export function hasVoxelWorkbook(projectId: string) {
  return /^(?:5[89]|6[0-4])$/.test(projectId);
}

/** Only offer a work target when the downloadable CMake project actually declares it. */
export function workbookOption(projectId: string) {
  if (hasVoxelWorkbook(projectId)) return "VOXEL_WORKBOOK";
  if (/^5[2-7]$/.test(projectId)) return "COURSE_WORKBOOK";
  return null;
}
