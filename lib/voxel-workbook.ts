/** Only these ZIPs provide the independent VOXEL_WORKBOOK CMake target. */
export function hasVoxelWorkbook(projectId: string) {
  return /^(?:5[89]|6[0-4])$/.test(projectId);
}

/** Every ZIP can seed an editable work/ tree. Keep the original voxel flag compatible. */
export function workbookOption(projectId: string) {
  return hasVoxelWorkbook(projectId) ? "VOXEL_WORKBOOK" : "COURSE_WORKBOOK";
}

/** Only these lessons have authored, replayable work-file edits; the others teach in starter/. */
export function hasGuidedWorkFiles(projectId: string) {
  return hasVoxelWorkbook(projectId) || /^(?:11|31|32|5[2-7])$/.test(projectId);
}

export function learnerBuild(projectId: string) {
  const guided = hasGuidedWorkFiles(projectId);
  const tree = guided ? "work" : "starter";
  return {
    tree,
    directory: guided ? "build-work" : "build",
    flags: guided
      ? `-D${workbookOption(projectId)}=ON`
      : "-DCOURSE_TEST_STARTER=ON -DBUILD_CHECKPOINTS=ON",
    target: `project_${Number(projectId)}_${tree}`,
    check: `project_${Number(projectId)}_check_work`,
  };
}
