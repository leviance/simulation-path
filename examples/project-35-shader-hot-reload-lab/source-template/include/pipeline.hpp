#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include "shutter_scene.hpp"
#include <cstdint>
#include <string>
#include <string_view>
#include <utility>
namespace lab {
struct ShaderSources {
    std::string vertex, fragment, vertexLabel, fragmentLabel;
};
// Trạng thái cảnh không giữ GLuint; nạp lại shader không đổi góc lá, vị trí hộp hoặc camera.
struct ReloadState {
    bool lastReloadSucceeded{true};
    unsigned generation{}, attempts{};
    std::string diagnostics;
};
} // namespace lab
