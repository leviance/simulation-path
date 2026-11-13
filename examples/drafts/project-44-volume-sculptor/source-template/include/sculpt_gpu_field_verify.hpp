#pragma once

#include "sculpt_field_slice.hpp"
#include "sculpt_gpu_document.hpp"
#include <bit>
#include <iostream>

namespace sculpt {

// A finite, explicit readback oracle. The interactive path never downloads a volume.
class GpuFieldLessonVerifier {
    public:
    explicit GpuFieldLessonVerifier(bool plane)
        : plane_(plane) {
        stamp_.center = {0.75F, 0, 0};
        stamp_.radius = 0.35F;
        stamp_.strength = 0.23F;
    }

    bool done() const {
        return pass_ == hashes_.size();
    }

    void tick(GpuFieldDocument& document, const GridSpec& grid) {
        if (done() || !document.stable())
            return;
        const auto count = std::min<std::size_t>(65536, grid.sampleCount() - first_);
        std::vector<float> values(count);
        document.field().read(first_ * sizeof(float), std::as_writable_bytes(std::span(values)));
        for (std::size_t local = 0; local < values.size(); ++local) {
            const auto id = first_ + local;
            const int x = static_cast<int>(id % grid.samples);
            const int y = static_cast<int>((id / grid.samples) % grid.samples);
            const int z = static_cast<int>(id / (grid.samples * grid.samples));
            const auto point = grid.worldFromGrid({static_cast<float>(x), static_cast<float>(y), static_cast<float>(z)});
            const auto expected = reference(point, x == 0 || y == 0 || z == 0 || x == grid.samples - 1 || y == grid.samples - 1 || z == grid.samples - 1);
            if (!std::isfinite(values[local]) || std::abs(values[local] - expected) > 0.000004)
                throw std::runtime_error("GPU field lesson differs from its independent double reference");
            worstError_ = std::max(worstError_, std::abs(values[local] - expected));
            hash_ ^= std::bit_cast<std::uint32_t>(values[local]);
            hash_ *= 1099511628211ULL;
        }
        first_ += count;
        if (first_ != grid.sampleCount())
            return;
        if (!document.guardsIntact())
            throw std::runtime_error("GPU field lesson modified a guard");
        hashes_[pass_] = hash_;
        if ((pass_ == 1 || pass_ == 4) && document.changedSampleWrites() == 0)
            throw std::runtime_error("The GPU brush fixture did not change any sample");
        if (pass_ == 1 && hash_ == hashes_[0])
            throw std::runtime_error("The GPU brush fixture left the initial field unchanged");
        if ((pass_ == 2 && hash_ != hashes_[0]) || (pass_ == 3 && hash_ != hashes_[1]) || (pass_ == 5 && hash_ != hashes_[1]) || (pass_ == 6 && hash_ != hashes_[5]) || (pass_ == 7 && hash_ != hashes_[4]))
            throw std::runtime_error("GPU field history/no-op did not preserve exact scalar bits");
        if (pass_ == 6 && (document.revision() != noopRevision_ || document.undoCount() != noopUndo_ || document.redoCount() != noopRedo_ || document.field().id() != noopBuffer_ || document.changedSampleWrites() != 0))
            throw std::runtime_error("GPU no-op changed revision, buffer, history or actual writes");
        ++pass_;
        first_ = 0;
        hash_ = 14695981039346656037ULL;
        if (done()) {
            checkProbes(document, grid);
            std::cout << "P44 GPU FIELD LESSON PASS samples=" << grid.sampleCount() << " cells=" << grid.cellCount() << " scalarPasses=8 bitExactHistory=5 numericProbes=27 maxError=" << worstError_ << " fieldBytes=" << grid.sampleCount() * sizeof(float) << " guardBytes=" << guardBytes << " meshes=0 countScanEmit=not-started\n";
            return;
        }
        if (pass_ == 1 || pass_ == 4) {
            stamp_.mode = BrushMode::add;
            if (pass_ == 4)
                stamp_.mode = BrushMode::subtract;
            if (!document.beginStroke(71, stamp_) || !document.endStroke(71))
                throw std::runtime_error("GPU field verifier could not queue its one-stamp transaction");
        } else if (pass_ == 2 || pass_ == 5) {
            if (!document.undo())
                throw std::runtime_error("GPU field verifier could not undo");
        } else if (pass_ == 3 || pass_ == 7) {
            if (!document.redo())
                throw std::runtime_error("GPU field verifier could not redo");
        } else if (pass_ == 6) {
            noopRevision_ = document.revision();
            noopUndo_ = document.undoCount();
            noopRedo_ = document.redoCount();
            noopBuffer_ = document.field().id();
            Brush outside;
            outside.center = {4, 4, 4};
            if (noopRedo_ != 1 || !document.beginStroke(72, outside) || !document.endStroke(72))
                throw std::runtime_error("GPU field verifier could not test no-op with retained redo");
        }
    }

    private:
    double reference(Vec3 p, bool boundary) const {
        double value = std::sqrt(static_cast<double>(p.x) * p.x + static_cast<double>(p.y) * p.y + static_cast<double>(p.z) * p.z) - 0.82;
        if (plane_) {
            const auto normal = normalized({1, 2, -1});
            value = static_cast<double>(p.x) * normal.x + static_cast<double>(p.y) * normal.y + static_cast<double>(p.z) * normal.z - 0.13;
        }
        if (pass_ == 0 || pass_ == 2 || boundary)
            return value;
        const double dx = static_cast<double>(p.x) - stamp_.center.x;
        const double dy = static_cast<double>(p.y) - stamp_.center.y;
        const double dz = static_cast<double>(p.z) - stamp_.center.z;
        const double ratioSquared = (dx * dx + dy * dy + dz * dz) / (static_cast<double>(stamp_.radius) * stamp_.radius);
        const double remaining = std::max(0.0, 1.0 - ratioSquared);
        const double delta = stamp_.strength * remaining * remaining;
        value = std::clamp(value - delta, -4.0, 4.0);
        if (pass_ == 4 || pass_ >= 7)
            value = std::clamp(value + delta, -4.0, 4.0);
        return value;
    }

    void checkProbes(const GpuFieldDocument& document, const GridSpec& grid) const {
        for (int axis = 0; axis < 3; ++axis) {
            for (const int layer : {0, grid.samples / 2, grid.samples - 1}) {
                for (const float u : {0.0F, 0.37F, 1.0F}) {
                    const SliceState slice{true, axis, layer, u, 1 - u};
                    const auto coordinate = sliceGridCoordinate(grid, slice);
                    const std::array<float, 3> c{coordinate.x, coordinate.y, coordinate.z};
                    std::array<int, 3> low{};
                    std::array<double, 3> fraction{};
                    for (int dimension = 0; dimension < 3; ++dimension) {
                        low[dimension] = std::min(static_cast<int>(std::floor(c[dimension])), grid.samples - 2);
                        fraction[dimension] = c[dimension] - low[dimension];
                    }
                    double expected = 0;
                    for (int corner = 0; corner < 8; ++corner) {
                        std::array<int, 3> sample{};
                        double weight = 1;
                        for (int dimension = 0; dimension < 3; ++dimension) {
                            const int high = (corner >> dimension) & 1;
                            sample[dimension] = low[dimension] + high;
                            if (high != 0)
                                weight *= fraction[dimension];
                            else
                                weight *= 1 - fraction[dimension];
                        }
                        const auto p = grid.worldFromGrid({static_cast<float>(sample[0]), static_cast<float>(sample[1]), static_cast<float>(sample[2])});
                        expected += weight * reference(p, sample[0] == 0 || sample[1] == 0 || sample[2] == 0 || sample[0] == grid.samples - 1 || sample[1] == grid.samples - 1 || sample[2] == grid.samples - 1);
                    }
                    if (std::abs(readSliceValue(document.field(), grid, slice) - expected) > 0.000004)
                        throw std::runtime_error("GPU numeric slice probe differs from eight weighted reference samples");
                }
            }
        }
    }

    Brush stamp_;
    std::array<std::uint64_t, 8> hashes_{};
    std::size_t pass_{}, first_{}, noopUndo_{}, noopRedo_{};
    std::uint32_t noopRevision_{};
    GLuint noopBuffer_{};
    std::uint64_t hash_{14695981039346656037ULL};
    double worstError_{};
    bool plane_{};
};

} // namespace sculpt
