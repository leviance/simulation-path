#pragma once
#include "geometry.hpp"
#include "workbench/session.hpp"
#include "tree.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 5
// Cùng một hàm cho chuột và bàn phím; nhãn cũng đọc trực tiếp hai tham số ấy.
inline double fraction(const Model& model, Binding binding) {
    if (binding == Binding::Radius) return (model.colony.params.radius - 20) / 120;
    return model.colony.params.separationWeight / 5;
}

inline void assign(Model& model, Binding binding, double t) {
    if (!std::isfinite(t)) return;
    const double at = std::clamp(t, 0.0, 1.0);
    if (binding == Binding::Radius) model.colony.params.radius = 20 + at * 120;
    if (binding == Binding::Separation) model.colony.params.separationWeight = 5 * at;
}
#endif
} // namespace lab
