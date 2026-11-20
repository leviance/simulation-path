#pragma once
#include "raster.hpp"

namespace trail {
// Màu trời phụ thuộc hướng nhìn, không phải một tấm ảnh gắn với địa hình.
inline void drawSky(Drawing& draw) {
    Frame& frame = draw.frame;

    for (int y = 0; y < frame.height; ++y) {
        const double rayY = draw.axes.forward.y + draw.axes.up.y * (frame.height * 0.5 - y) / draw.focal;
        const Color sky = blend({204, 226, 224}, {86, 158, 208}, smooth(-0.04, 0.83, rayY));
        auto row = frame.pixels.begin() + y * frame.width;
        std::fill_n(row, frame.width, sky);
    }
}
} // namespace trail
