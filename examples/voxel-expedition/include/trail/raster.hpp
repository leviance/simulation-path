#pragma once
#include "camera.hpp"
#include "materials.hpp"
#include "surface.hpp"
#include <array>
#include <vector>

namespace trail {
inline constexpr double nearPlane = 0.10;
struct Vertex {
    Vec3 view;
    double u, v;
};
struct PixelVertex {
    double x, y, q, uq, vq;
};

inline Vertex between(Vertex a, Vertex b, double t) {
    return {a.view + (b.view - a.view) * t, std::lerp(a.u, b.u, t), std::lerp(a.v, b.v, t)};
}

class Frame {
public:
    int width, height;
    std::vector<Color> pixels;
    std::vector<float> depth;
    explicit Frame(int w = 800, int h = 450)
        : width(w), height(h), pixels(w * h), depth(w * h) {}

    void clear() {
        std::fill(depth.begin(), depth.end(), 0.0f);
    }
};

struct Drawing {
    Frame& frame;
    const Atlas& atlas;
    Camera camera;
    Basis axes;
    double focal;
    Vec3 sun = normalized({-0.6, 0.88, -0.3});
    Color haze{182, 207, 213};
    double fogStart = 32;
    double fogEnd = 83;
    bool depthTest = true;

    Drawing(Frame& image, const Atlas& tiles, Camera eye)
        : frame(image), atlas(tiles), camera(eye), axes(basis(eye)), focal(focalLength(image.height, eye.verticalFov)) {}

    PixelVertex project(Vertex point) const {
        const double inverse = 1.0 / point.view.z;
        return {frame.width * 0.5 + focal * point.view.x * inverse, frame.height * 0.5 - focal * point.view.y * inverse, inverse, point.u * inverse, point.v * inverse};
    }

    void triangle(PixelVertex a, PixelVertex b, PixelVertex c, Block block, int face, double light, Color fog, double mist) {
        const double dx1 = b.x - a.x, dy1 = b.y - a.y, dx2 = c.x - a.x, dy2 = c.y - a.y;
        const double area = dx1 * dy2 - dx2 * dy1;
        if (std::abs(area) < 1e-7)
            return;
        const int x0 = std::max(0, int(std::floor(std::min({a.x, b.x, c.x}))));
        const int x1 = std::min(frame.width - 1, int(std::ceil(std::max({a.x, b.x, c.x}))));
        const int y0 = std::max(0, int(std::floor(std::min({a.y, b.y, c.y}))));
        const int y1 = std::min(frame.height - 1, int(std::ceil(std::max({a.y, b.y, c.y}))));
        if (x0 > x1 || y0 > y1)
            return;
        const double invArea = 1.0 / area;
        const double gain = light * (1.0 - mist);
        for (int y = y0; y <= y1; ++y) {
            const double py = y + 0.5 - a.y;
            const double px = x0 + 0.5 - a.x;
            double wb = (px * dy2 - py * dx2) * invArea;
            double wc = (dx1 * py - dy1 * px) * invArea;
            for (int x = x0; x <= x1; ++x, wb += dy2 * invArea, wc -= dy1 * invArea) {
                const double wa = 1 - wb - wc;
                if (wb < -1e-8 || wc < -1e-8 || wa < -1e-8)
                    continue;
                const int i = y * frame.width + x;
                const double q = wa * a.q + wb * b.q + wc * c.q;
                if (depthTest && q <= frame.depth[i])
                    continue;
                // Nội suy u/z và 1/z để hoa văn không bị kéo giãn ở phía xa.
                const double u = (wa * a.uq + wb * b.uq + wc * c.uq) / q;
                const double v = (wa * a.vq + wb * b.vq + wc * c.vq) / q;
                const Color texel = atlas.sample(block, face, u, v);
                frame.pixels[i] = {channel(texel.r * gain + fog.r * mist), channel(texel.g * gain + fog.g * mist), channel(texel.b * gain + fog.b * mist)};
                frame.depth[i] = static_cast<float>(q);
            }
        }
    }

    void quad(const std::array<Vec3, 4>& p, double w, double h, Block block, int face, double light, double uOffset = 0, double vOffset = 0) {
        constexpr std::array<double, 4> us{0, 1, 1, 0}, vs{0, 0, 1, 1};
        std::array<Vertex, 4> input{};
        for (int i = 0; i < 4; ++i) {
            input[i] = {cameraSpace(p[i], camera.eye, axes), us[i] * w + uOffset, vs[i] * h + vOffset};
        }
        finishQuad(input, block, face, light);
    }

    void finishQuad(const std::array<Vertex, 4>& input, Block block, int face, double light) {
        // Cắt ở near plane trước khi chia cho z; cả bốn đỉnh có thể nằm sau mắt.
        std::array<Vertex, 6> clipped{};
        int n = 0;
        Vertex before = input.back();
        for (Vertex next : input) {
            const bool a = before.view.z >= nearPlane, b = next.view.z >= nearPlane;
            if (a != b) {
                clipped[n++] = between(before, next, (nearPlane - before.view.z) / (next.view.z - before.view.z));
            }
            if (b)
                clipped[n++] = next;
            before = next;
        }
        if (n < 3)
            return;
        const double distance = 0.5 * (input[0].view.z + input[2].view.z);
        const double mist = 0.82 * smooth(fogStart, fogEnd, distance);
        const PixelVertex first = project(clipped[0]);
        PixelVertex last = project(clipped[1]);
        for (int i = 2; i < n; ++i) {
            const PixelVertex next = project(clipped[i]);
            triangle(first, last, next, block, face, light, haze, mist);
            last = next;
        }
    }

    void drawFace(const Face& face) {
        const Cell n = neighbors[face.direction];
        const Vec3 normal{double(n.x), double(n.y), double(n.z)};
        if (dot(camera.eye - face.origin, normal) <= 0)
            return;
        const Vec3 u = faceU[face.direction] * face.width;
        const Vec3 v = faceV[face.direction] * face.height;
        const double diffuse = std::max(0.0, dot(normal, sun));
        const double light = 0.61 + 0.48 * diffuse + 0.06 * normal.y;
        quad({face.origin, face.origin + u, face.origin + u + v, face.origin + v}, face.width, face.height, face.block, face.direction, light);
    }
};
} // namespace trail
