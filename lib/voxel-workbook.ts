/** Only these ZIPs provide the independent VOXEL_WORKBOOK CMake target. */
export function hasVoxelWorkbook(projectId: string) {
  return /^(?:5[89]|6[0-4])$/.test(projectId);
}
