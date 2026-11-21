#pragma once

#include "gpu_renderer.hpp"

#if LAB_CHECKPOINT >= 9
namespace lab {

// Cùng mặt phẳng y = -1.5 của Project 16. Lưới là phông tĩnh: người học
// có thể xoay tam giác và vẫn thấy ngay vật đang quay, không phải camera.
inline bool makeReferenceFloor(Framebuffer& image, int width, int height) {
    if (!image.resize(width, height)) {
        return false;
    }
    image.clear({17.0F / 255, 24.0F / 255, 43.0F / 255});
    const Color grid{40.0F / 255, 51.0F / 255, 77.0F / 255};
    const Transform2D fit = forPanel({}, width, height);
    auto screen = [&](float x, float z) {
        const Vec2 projected = project16Position(x, -1.5F, z);
        return ndcToCpuScreen(transformPosition(projected, fit), width, height);
    };
    auto line = [&](Vec2 a, Vec2 b) {
        const Vec2 delta = subtract(b, a);
        const int steps = std::max(1, int(std::ceil(std::max(std::abs(delta.x), std::abs(delta.y)))));
        for (int i = 0; i <= steps; ++i) {
            const float t = float(i) / float(steps);
            image.putPixel(int(std::lround(a.x + t * delta.x)), int(std::lround(a.y + t * delta.y)), grid);
        }
    };
    for (int x = -6; x <= 6; ++x) {
        line(screen(float(x), 2), screen(float(x), 16));
    }
    for (int z = 2; z <= 16; ++z) {
        line(screen(-6, float(z)), screen(6, float(z)));
    }
    return true;
}

struct ReferenceFloor {
    Framebuffer right;
    Framebuffer oddLeft;
    CpuTexturePresenter presenter;

    bool prepare(GlApi& gl, int leftWidth, int rightWidth, int height) {
        if (right.width != rightWidth || right.height != height) {
            if (!makeReferenceFloor(right, rightWidth, height) || !presenter.resize(gl, rightWidth, height)) {
                return false;
            }
            presenter.upload(gl, right);
        }
        if (leftWidth != rightWidth && (oddLeft.width != leftWidth || oddLeft.height != height)) {
            return makeReferenceFloor(oddLeft, leftWidth, height);
        }
        return true;
    }

    const Framebuffer& left(int leftWidth) const {
        if (leftWidth == right.width) {
            return right;
        }
        return oddLeft;
    }
};
} // namespace lab
#endif
