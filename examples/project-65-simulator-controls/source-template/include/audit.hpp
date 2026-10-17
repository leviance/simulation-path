#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

#include "controls.hpp"

namespace lab {

// Audit chỉ đọc dữ liệu, không tự sửa state để che đi lỗi của chương trình.
#if LAB_CHECKPOINT >= 7
inline bool validControl(Control control) {
    return control == Control::None || control == Control::Pause || control == Control::Reset || control == Control::Gravity;
}

inline bool audit(const Model& model, const Ui& ui) {
    const bool finite = std::isfinite(model.y) && std::isfinite(model.velocity) && std::isfinite(model.gravity) && std::isfinite(model.accumulator);
    const bool bounds = model.y >= 48.0 && model.y <= floorY - ballRadius && model.gravity >= 0.0 && model.gravity <= 1200.0;
    const bool clock = model.accumulator >= 0.0 && model.accumulator < fixedDt + 1e-12;
    const bool controls = validControl(ui.hot) && validControl(ui.active) && validControl(ui.focus);

    return finite && bounds && clock && controls && model.scenePresses >= 0;
}
#endif

} // namespace lab
