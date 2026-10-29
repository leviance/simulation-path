#pragma once

// Giá trị cố định trong snapshot; người học không cần định nghĩa macro khi build.
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 11
#endif

namespace survey {
#if LAB_CHECKPOINT >= 11
inline constexpr int stage = 11;
#elif LAB_CHECKPOINT >= 10
inline constexpr int stage = 10;
#elif LAB_CHECKPOINT >= 9
inline constexpr int stage = 9;
#elif LAB_CHECKPOINT >= 8
inline constexpr int stage = 8;
#elif LAB_CHECKPOINT >= 7
inline constexpr int stage = 7;
#elif LAB_CHECKPOINT >= 6
inline constexpr int stage = 6;
#elif LAB_CHECKPOINT >= 5
inline constexpr int stage = 5;
#elif LAB_CHECKPOINT >= 4
inline constexpr int stage = 4;
#elif LAB_CHECKPOINT >= 3
inline constexpr int stage = 3;
#elif LAB_CHECKPOINT >= 2
inline constexpr int stage = 2;
#elif LAB_CHECKPOINT >= 1
inline constexpr int stage = 1;
#else
inline constexpr int stage = 0;
#endif
} // namespace survey
