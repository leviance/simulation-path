#pragma once
#include "controls.hpp"

namespace lab {
// Audit chỉ đọc. Hàng xóm được đối chiếu với vòng duyệt vét cạn của P28.
#if LAB_CHECKPOINT >= 7
// [snippet audit-grid]
inline bool audit(const Model& model, const Ui& ui) {
    const auto& colony = model.colony;
    if (!validParams(colony.params) || colony.selected >= colony.birds.size()) return false;
    if (model.accumulator < 0 || model.accumulator >= fixedDt + 1e-12) return false;
    auto actual = colony.observe().neighbors;
    std::vector<std::size_t> expected;
    findNeighbors(colony.birds, colony.selected, colony.params, expected);
    std::sort(actual.begin(), actual.end());
    if (actual != expected) return false;
    for (Control c : {ui.active, ui.hot, ui.focus})
        if (c != Control::None && std::find(order.begin(), order.end(), c) == order.end()) return false;
    return true;
}
// [/snippet audit-grid]
#endif
} // namespace lab
