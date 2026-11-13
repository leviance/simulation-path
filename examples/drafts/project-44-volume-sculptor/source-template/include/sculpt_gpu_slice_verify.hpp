#pragma once

#include "sculpt_gpu_edit_verify.hpp"
#include "sculpt_slice_inspector.hpp"

namespace sculpt {

inline void verifySliceProbes(const GpuMeshBuilder& model, bool plane) {
    const auto& grid = model.settings().grid;
    const auto normal = normalized({1, 2, -1});
    const std::array<std::array<float, 2>, 5> uv{{{0, 0}, {1, 0}, {0, 1}, {1, 1}, {0.17F, 0.63F}}};
    double worst = 0;
    for (int axis = 0; axis < 3; ++axis)
        for (int layer : {0, grid.samples / 2, grid.samples - 1})
            for (const auto coordinate : uv) {
                const SliceState slice{true, axis, layer, coordinate[0], coordinate[1]};
                const auto actual = probeSliceField(model, slice);
                double expected = 0;
                if (plane)
                    expected = static_cast<double>(actual.worldPoint.x) * normal.x + static_cast<double>(actual.worldPoint.y) * normal.y + static_cast<double>(actual.worldPoint.z) * normal.z - 0.13;
                else {
                    // Independent weighted sum of eight analytic corner values, not the probe's four lerps.
                    const std::array<double, 3> c{actual.gridCoordinate.x, actual.gridCoordinate.y, actual.gridCoordinate.z};
                    std::array<int, 3> low{};
                    std::array<double, 3> fraction{};
                    for (int dimension = 0; dimension < 3; ++dimension) {
                        low[dimension] = std::min(static_cast<int>(std::floor(c[dimension])), grid.samples - 2);
                        fraction[dimension] = c[dimension] - low[dimension];
                    }
                    for (unsigned mask = 0; mask < 8; ++mask) {
                        double weight = 1;
                        std::array<double, 3> p{};
                        const std::array<float, 3> origin{grid.origin.x, grid.origin.y, grid.origin.z};
                        for (unsigned dimension = 0; dimension < 3; ++dimension) {
                            unsigned corner = 0;
                            if ((mask & (1U << dimension)) != 0)
                                corner = 1;
                            double factor = 1 - fraction[dimension];
                            if (corner != 0)
                                factor = fraction[dimension];
                            weight *= factor;
                            p[dimension] = static_cast<double>(origin[dimension]) + (low[dimension] + corner) * static_cast<double>(grid.spacing());
                        }
                        expected += weight * (std::sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]) - 0.82);
                    }
                }
                const auto error = std::abs(actual.value - expected);
                gpuCheck(error < 0.000003 && actual.fieldRevision == model.document().revision(), "Numeric slice probe differs from the independent field reference or revision");
                worst = std::max(worst, error);
            }
    std::cout << "GPU SLICE PROBE PASS axes=3 layers=3 probes=45 bytesPerProbe=32 maxScalarError=" << worst << '\n';
}

inline void verifySlicePixels(const GpuMeshBuilder& model, SliceInspector& inspector, SliceRenderer& renderer, GlApi& gl, int width, int height, int logicalWidth, int logicalHeight) {
    const int savedAxis = inspector.state().axis;
    inspector.enabled(true);
    inspector.layout(model.settings().grid, logicalWidth - nativePanelWidth, logicalHeight);
    unsigned checks = 0;
    for (int axis = 0; axis < 3; ++axis) {
        inspector.axis(axis);
        inspector.update(model);
        renderer.draw(model, inspector, width, height, logicalWidth, logicalHeight);
        const auto& r = inspector.rectangle();
        const double sx = static_cast<double>(width) / logicalWidth, sy = static_cast<double>(height) / logicalHeight;
        const int left = static_cast<int>(r.x * sx), bottom = static_cast<int>((logicalHeight - r.y - r.height) * sy);
        const int w = static_cast<int>(r.width * sx), h = static_cast<int>(r.height * sy);
        unsigned negative = 0, positive = 0;
        for (const auto uv : std::array<std::array<float, 2>, 4>{{{0.32F, 0.32F}, {0.1F, 0.12F}, {0.2F, 0.8F}, {0.8F, 0.2F}}}) {
            const int x = left + static_cast<int>(uv[0] * w), y = bottom + static_cast<int>((1 - uv[1]) * h);
            SliceState sample = inspector.state();
            sample.u = static_cast<float>(x - left + 0.5) / w;
            sample.v = 1 - static_cast<float>(y - bottom + 0.5) / h;
            const float signedValue = probeSliceField(model, sample).value - model.settings().isovalue;
            gpuCheck(std::abs(signedValue) > 0.03F, "Slice pixel fixture is too close to its contour");
            std::array<std::uint8_t, 4> pixel{};
            gl.ReadPixels(x, y, 1, 1, GL_RGBA, GL_UNSIGNED_BYTE, pixel.data());
            gpuCheck(gl.GetError() == GL_NO_ERROR, "Slice pixel readback failed");
            if (signedValue < 0) {
                gpuCheck(pixel[2] > pixel[0] + 8, "Negative field sample was not rendered blue on the matching slice plane");
                ++negative;
            } else {
                gpuCheck(pixel[0] > pixel[2] + 8, "Positive field sample was not rendered amber on the matching slice plane");
                ++positive;
            }
            ++checks;
        }
        gpuCheck(negative != 0 && positive != 0, "Slice pixel fixture did not exercise both field signs");
    }
    inspector.axis(savedAxis);
    std::cout << "GPU SLICE PIXELS PASS axes=3 pixels=" << checks << " sameStoredField=1 signColors=1 dprViewport=1\n";
}

} // namespace sculpt
