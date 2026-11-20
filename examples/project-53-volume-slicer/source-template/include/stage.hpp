#pragma once

// The generator resolves these authoring branches into independent source snapshots.

#if LAB_CHECKPOINT == 0
inline constexpr int lessonStage = 0;
#elif LAB_CHECKPOINT == 1
inline constexpr int lessonStage = 1;
#elif LAB_CHECKPOINT == 2
inline constexpr int lessonStage = 2;
#elif LAB_CHECKPOINT == 3
inline constexpr int lessonStage = 3;
#elif LAB_CHECKPOINT == 4
inline constexpr int lessonStage = 4;
#elif LAB_CHECKPOINT == 5
inline constexpr int lessonStage = 5;
#elif LAB_CHECKPOINT == 6
inline constexpr int lessonStage = 6;
#elif LAB_CHECKPOINT == 7
inline constexpr int lessonStage = 7;
#elif LAB_CHECKPOINT == 8
inline constexpr int lessonStage = 8;
#elif LAB_CHECKPOINT == 9
inline constexpr int lessonStage = 9;
#endif
