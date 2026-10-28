#pragma once
#include "pipeline.hpp"

namespace lab {
using ShaderColor = std::array<double, 3>;

inline double smoothRange(double low, double high, double value) {
    const double t = std::clamp((value - low) / (high - low), 0.0, 1.0);
    return t * t * (3 - 2 * t);
}

inline ShaderColor mixColor(ShaderColor a, ShaderColor b, double t) {
    for (std::size_t channel = 0; channel < 3; ++channel)
        a[channel] += (b[channel] - a[channel]) * t;
    return a;
}

inline double hashCell(std::int32_t x, std::int32_t y) {
    std::uint32_t h = std::uint32_t(x) * 374761393U + std::uint32_t(y) * 668265263U;
    h = (h ^ (h >> 13U)) * 1274126177U;
    h ^= h >> 16U;
    return double(h & 65535U) / 65535;
}

inline double valueNoise(double x, double y) {
    const auto ix = std::int32_t(std::floor(x)), iy = std::int32_t(std::floor(y));
    const double fx = smoothRange(0, 1, x - std::floor(x)), fy = smoothRange(0, 1, y - std::floor(y));
    const double bottom = hashCell(ix, iy) * (1 - fx) + hashCell(ix + 1, iy) * fx;
    const double top = hashCell(ix, iy + 1) * (1 - fx) + hashCell(ix + 1, iy + 1) * fx;
    return bottom * (1 - fy) + top * fy;
}

inline double fbm(double x, double y) {
    double value = 0, amplitude = 0.5;
    for (int octave = 0; octave < 5; ++octave) {
        value += amplitude * valueNoise(x, y);
        x = x * 2.03 + 1.7;
        y = y * 2.03 - 2.1;
        amplitude *= 0.5;
    }
    return value;
}

struct MandelbrotOrbit {
    int escaped{};
    double x{}, y{};
};

inline MandelbrotOrbit mandelbrotOrbit(double cx, double cy) {
    MandelbrotOrbit orbit{};
    for (int iteration = 0; iteration < 128; ++iteration) {
        const double nextX = orbit.x * orbit.x - orbit.y * orbit.y + cx;
        orbit.y = 2 * orbit.x * orbit.y + cy;
        orbit.x = nextX;
        if (orbit.x * orbit.x + orbit.y * orbit.y > 4) {
            orbit.escaped = iteration + 1;
            break;
        }
    }
    return orbit;
}

// Analytic/reference samples for GPU readback. Coordinates are OpenGL pixel
// centers (bottom-left), and uniforms are the exact float snapshot uploaded.
inline ShaderColor referenceShaderColor(std::size_t effect, double x, double y, const UniformSnapshot& u) {
    if (effect >= kEffects.size() || u.width <= 0 || u.height <= 0)
        throw std::invalid_argument("Invalid effect sample");
    const double uvX = x / u.width, uvY = y / u.height;
    const double mouseX = double(u.mouseX) / u.width, mouseY = double(u.mouseY) / u.height;
    const double unit = std::min(u.width, u.height);
    const double px = (2 * x - u.width) / unit, py = (2 * y - u.height) / unit;
    ShaderColor color{};
    if (effect == 0) {
        const double phase = uvY + 0.18 * std::sin(uvX * 5 * u.zoom + u.time * 0.65);
        const double glow = std::exp(-20 * ((uvX - mouseX) * (uvX - mouseX) + (uvY - mouseY) * (uvY - mouseY)));
        const ShaderColor dark{0.025, 0.045, 0.13}, offsets{0, 0.24, 0.44}, light{0.12, 0.19, 0.20};
        for (std::size_t i = 0; i < 3; ++i) {
            const double palette = 0.5 + 0.5 * std::cos(6.2831853 * (phase + offsets[i]));
            color[i] = dark[i] + (palette - dark[i]) * (0.25 + 0.65 * uvY) + light[i] * glow;
        }
    } else if (effect == 1) {
        const double cx = (2 * u.mouseX - u.width) / unit * 0.55;
        const double cy = (2 * u.mouseY - u.height) / unit * 0.55;
        const double radius = 0.50 * std::sqrt(u.zoom), distance = std::hypot(px - cx, py - cy);
        const double edge = distance - radius, aa = 2 / unit;
        const double disc = 1 - smoothRange(-aa, aa, edge), glow = std::exp(-std::abs(edge) * 18);
        const double waves = 0.5 + 0.5 * std::cos(distance * 22 - u.time * 0.8 * 6);
        const auto inside = mixColor({0.08, 0.20, 0.45}, {0.13, 0.65, 0.78}, waves);
        const ShaderColor dark{0.025, 0.04, 0.095}, rim{0.30, 0.75, 0.95};
        for (std::size_t i = 0; i < 3; ++i)
            color[i] = dark[i] + disc * inside[i] + rim[i] * glow * 0.65;
    } else if (effect == 2) {
        const auto orbit = mandelbrotOrbit(-0.6 + px * (1.35 / u.zoom) + (mouseX - 0.5) * 0.7, py * (1.35 / u.zoom) + (mouseY - 0.5) * 0.5);
        color = {0.012, 0.018, 0.045};
        if (orbit.escaped) {
            const double smoothCount = orbit.escaped + 1 - std::log2(std::max(0.001, std::log2(std::hypot(orbit.x, orbit.y))));
            const double phase = 0.035 * smoothCount + u.time * 0.12;
            const ShaderColor offset{0, 0.18, 0.39};
            for (std::size_t i = 0; i < 3; ++i)
                color[i] = (0.5 + 0.5 * std::cos(6.2831853 * (phase + offset[i]))) * (0.45 + 0.55 * (1 - std::exp(-orbit.escaped * 0.08)));
        }
    } else {
        const double nx = px * 2.2 * u.zoom + (mouseX - 0.5) * 2;
        const double ny = py * 2.2 * u.zoom + (mouseY - 0.5) * 2;
        const double flowX = u.time * 0.18, flowY = -u.time * 0.18 * 0.7;
        const double warp = fbm(nx + flowX, ny + flowY);
        const double n = fbm(nx + warp * 2.5 - flowX, ny - warp * 1.8 - flowY);
        color = mixColor({0.025, 0.045, 0.13}, {0.09, 0.69, 0.72}, smoothRange(0.15, 0.78, n));
        const ShaderColor warm{0.82, 0.37, 0.12};
        for (std::size_t i = 0; i < 3; ++i)
            color[i] += warm[i] * std::pow(std::max(0.0, n), 5);
    }
    for (double& channel : color)
        channel = std::clamp(channel, 0.0, 1.0);
    return color;
}
} // namespace lab
