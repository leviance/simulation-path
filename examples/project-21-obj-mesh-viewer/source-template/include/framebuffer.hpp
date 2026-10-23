#pragma once
#include "geometry.hpp"

namespace lab {
// Presentation có kích thước logic cố định, không cấp phát lại theo DPI/window.
struct Framebuffer {
    int width{800};
    int height{500};
    std::vector<std::uint32_t> pixels = std::vector<std::uint32_t>(400000, 0x090f1dffU);

    void clear() {
        std::fill(pixels.begin(), pixels.end(), 0x090f1dffU);
    }
};

#if LAB_CHECKPOINT >= 1
inline void putPixel(Framebuffer& frame, int x, int y, std::uint32_t color) {
    if (x >= 0 && x < frame.width && y >= 0 && y < frame.height) {
        frame.pixels[std::size_t(y) * std::size_t(frame.width) + std::size_t(x)] = color;
    }
}

// Clip trong screen space trước khi đổi sang int: không chạy hàng triệu bước ngoài viewport.
inline void drawLine(Framebuffer& frame, ScreenVertex a, ScreenVertex b, std::uint32_t color, const std::vector<double>* depths = nullptr) {
    const double dx = b.x - a.x;
    const double dy = b.y - a.y;
    double first = 0.0;
    double last = 1.0;
    const auto clip = [&](double p, double q) {
        if (std::abs(p) < 1e-12) {
            return q >= 0.0;
        }
        const double t = q / p;
        if (p < 0.0) {
            first = std::max(first, t);
        } else {
            last = std::min(last, t);
        }
        return first <= last;
    };
    if (!clip(-dx, a.x) || !clip(dx, frame.width - 1.0 - a.x) || !clip(-dy, a.y) || !clip(dy, frame.height - 1.0 - a.y)) {
        return;
    }
    const double span = std::max(std::abs(dx), std::abs(dy));
    const int steps = std::max(1, int(std::ceil(span * (last - first))));
    for (int step = 0; step <= steps; ++step) {
        const double t = first + (last - first) * double(step) / double(steps);
        const int x = int(std::lround(a.x + dx * t));
        const int y = int(std::lround(a.y + dy * t));
        if (x < 0 || x >= frame.width || y < 0 || y >= frame.height) {
            continue;
        }
        const auto index = std::size_t(y) * std::size_t(frame.width) + std::size_t(x);
        const double depth = a.ndcDepth + (b.ndcDepth - a.ndcDepth) * t;
        if (!depths || depth <= (*depths)[index] + 1e-5) {
            frame.pixels[index] = color;
        }
    }
}

inline bool clipSegmentDepth(Vec3& a, Vec3& b, double nearPlane = 0.7, double farPlane = 20.0) {
    for (const double plane : {nearPlane, farPlane}) {
        bool aInside = a.z >= plane;
        bool bInside = b.z >= plane;
        if (plane == farPlane) {
            aInside = a.z <= plane;
            bInside = b.z <= plane;
        }
        if (!aInside && !bInside) {
            return false;
        }
        if (aInside != bInside) {
            const double t = (plane - a.z) / (b.z - a.z);
            Vec3 intersection = a + (b - a) * t;
            intersection.z = plane;
            if (!aInside) {
                a = intersection;
            } else {
                b = intersection;
            }
        }
    }
    return true;
}

inline void drawCameraLine(Framebuffer& frame, Vec3 a, Vec3 b, std::uint32_t color, const std::vector<double>* depths = nullptr) {
    if (!clipSegmentDepth(a, b)) {
        return;
    }
    const auto screenA = projectVertex(a, frame.width, frame.height);
    const auto screenB = projectVertex(b, frame.width, frame.height);
    if (screenA && screenB) {
        drawLine(frame, *screenA, *screenB, color, depths);
    }
}
#endif
} // namespace lab
