#pragma once

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>

namespace project31 {

struct StarLight {
    float red{};
    float green{};
    float blue{};
};

// Lưới này nằm trên ảnh, không phải octree dùng để tính lực.
// Phần đệm giữ được ánh sáng của những sao vừa ra ngoài khung nhìn.
struct LightField {
    static constexpr int margin = 10;
    int cell;
    int columns;
    int rows;
    std::span<StarLight> detail;
    std::span<StarLight> scratch;
    std::span<StarLight> veil;
};

inline void exposeStar(LightField& field, double x, double y, const StarLight& flux) {
    const double u = x / field.cell + LightField::margin - 0.5;
    const double v = y / field.cell + LightField::margin - 0.5;
    const int ix = int(std::floor(u));
    const int iy = int(std::floor(v));
    if (ix < 0 || iy < 0 || ix + 1 >= field.columns || iy + 1 >= field.rows) {
        return;
    }
    const double fx = u - ix;
    const double fy = v - iy;
    // Chia quang thông cho bốn ô: sao đang di chuyển không nhảy giữa hai ô.
    for (int dy = 0; dy <= 1; ++dy) {
        double wy = 1.0 - fy;
        if (dy == 1) {
            wy = fy;
        }
        for (int dx = 0; dx <= 1; ++dx) {
            double wx = 1.0 - fx;
            if (dx == 1) {
                wx = fx;
            }
            const float weight = float(wx * wy);
            StarLight& texel = field.detail[std::size_t((iy + dy) * field.columns + ix + dx)];
            texel.red += flux.red * weight;
            texel.green += flux.green * weight;
            texel.blue += flux.blue * weight;
        }
    }
}

inline void boxLightPass(
    std::span<const StarLight> input, std::span<StarLight> output,
    int length, int lines, int stride, int lineStep, int radius, int centerWeight
) {
    const double inverse = 1.0 / (2 * radius + 1 + centerWeight);
    for (int line = 0; line < lines; ++line) {
        const int base = line * lineStep;
        double red = 0, green = 0, blue = 0;
        for (int tap = 0; tap <= radius && tap < length; ++tap) {
            const auto& entering = input[std::size_t(base + tap * stride)];
            red += entering.red;
            green += entering.green;
            blue += entering.blue;
        }
        for (int j = 0; j < length; ++j) {
            const int i = base + j * stride;
            const StarLight& center = input[std::size_t(i)];
            output[std::size_t(i)] = {
                float((red + centerWeight * center.red) * inverse),
                float((green + centerWeight * center.green) * inverse),
                float((blue + centerWeight * center.blue) * inverse),
            };
            // Dời cửa sổ lấy trung bình: bỏ mẫu vừa đi qua, thêm mẫu mới phía trước.
            if (j >= radius) {
                const auto& leaving = input[std::size_t(i - radius * stride)];
                red -= leaving.red;
                green -= leaving.green;
                blue -= leaving.blue;
            }
            if (j + radius + 1 < length) {
                const auto& entering = input[std::size_t(i + (radius + 1) * stride)];
                red += entering.red;
                green += entering.green;
                blue += entering.blue;
            }
        }
    }
}

inline void gatherLight(LightField& field, std::span<const StarLight> input, std::span<StarLight> output, int radius, int centerWeight = 0) {
    boxLightPass(input, field.scratch, field.columns, field.rows, 1, field.columns, radius, centerWeight);
    boxLightPass(field.scratch, output, field.rows, field.columns, field.columns, 1, radius, centerWeight);
}

inline double densityGain(const StarLight& texel, double floor, double knee) {
    const double mean = (texel.red + texel.green + texel.blue) / 3.0;
    const double excess = std::max(0.0, mean - floor);
    return excess / (excess + knee);
}

inline float sampleLight(float northwest, float northeast, float southwest, float southeast, double fx, double fy) {
    const double top = northwest + fx * (northeast - northwest);
    const double bottom = southwest + fx * (southeast - southwest);
    return float(top + fy * (bottom - top));
}

inline void developField(LightField& field, std::span<StarLight> light, int width, int height) {
    // Ánh sao gần nhau cùng làm lộ nhánh xoắn; vùng thưa không hóa thành các đĩa sáng rời rạc.
    gatherLight(field, field.detail, field.detail, 1, 1);
    gatherLight(field, field.detail, field.veil, 3);
    gatherLight(field, field.veil, field.veil, 3);
    for (std::size_t i = 0; i < field.detail.size(); ++i) {
        StarLight& close = field.detail[i];
        const StarLight& wide = field.veil[i];
        const double local = close.red + close.green + close.blue;
        const double envelope = wide.red + wide.green + wide.blue;
        const double ridge = std::clamp((local - 0.30 * envelope) / (0.16 + 0.70 * envelope), 0.0, 1.0);
        const double neighbours = densityGain(wide, 0.024, 0.095);
        const double narrowGain = 0.36 * neighbours * densityGain(close, 0.055, 0.45);
        const double wideGain = (0.075 + 0.12 * ridge) * densityGain(wide, 0.018, 0.38);
        close = {
            float(close.red * narrowGain + wide.red * wideGain),
            float(close.green * narrowGain + wide.green * wideGain),
            float(close.blue * narrowGain + wide.blue * wideGain),
        };
    }
    for (int y = 0; y < height; ++y) {
        const double v = (y + 0.5) / field.cell + LightField::margin - 0.5;
        const int iy = int(std::floor(v));
        const double fy = v - iy;
        for (int x = 0; x < width; ++x) {
            const double u = (x + 0.5) / field.cell + LightField::margin - 0.5;
            const int ix = int(std::floor(u));
            const double fx = u - ix;
            const int a = iy * field.columns + ix;
            const int b = a + field.columns;
            const StarLight& nw = field.detail[a];
            const StarLight& ne = field.detail[a + 1];
            const StarLight& sw = field.detail[b];
            const StarLight& se = field.detail[b + 1];
            StarLight& pixel = light[std::size_t(y * width + x)];
            pixel.red += sampleLight(nw.red, ne.red, sw.red, se.red, fx, fy);
            pixel.green += sampleLight(nw.green, ne.green, sw.green, se.green, fx, fy);
            pixel.blue += sampleLight(nw.blue, ne.blue, sw.blue, se.blue, fx, fy);
        }
    }
}

} // namespace project31
