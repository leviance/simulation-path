#pragma once

#include "sculpt_gpu_layout.hpp"
#include <iostream>

namespace sculpt {

// Known inputs exercise block boundaries independently of isosurface counting.
class GpuScanVerifier {
    public:
    GpuScanVerifier(GlApi& gl, GpuBudget& budget)
        : layout_(gl, budget, ModelSettings{GridSpec{32}}), ticket_(gl), input_(cellsPerChunk) {}

    bool done() const {
        return pattern_ == 4;
    }

    void tick() {
        if (done())
            return;
        if (ticket_.busy()) {
            if (!ticket_.poll())
                return;
            const auto output = layout_.readLayout(0);
            const auto stats = layout_.readStats(0);
            std::uint64_t prefix = 0;
            for (std::size_t index = 0; index < input_.size(); ++index) {
                if (output[0][index] != input_[index] || output[1][index] != prefix)
                    throw std::runtime_error("GPU scan differs from the independent sequential uint64 prefix");
                prefix += input_[index];
            }
            if (stats.vertices != prefix || stats.emitted != 0 || !layout_.guardsIntact())
                throw std::runtime_error("GPU scan total, emitted counter or guard is invalid");
            ++pattern_;
            if (done()) {
                std::cout << "GPU SCAN FIXTURES PASS patterns=4 cellsPerPattern=4096 checkedOffsets=16384 zero=1 maximum=36 blockBoundaryImpulses=1 seededMixed=1 emitted=0 canaries=ok\n";
                return;
            }
        }
        std::fill(input_.begin(), input_.end(), 0U);
        if (pattern_ == 1)
            std::fill(input_.begin(), input_.end(), 36U);
        else if (pattern_ == 2) {
            for (const std::size_t index : {0U, 255U, 256U, 511U, 512U, 1023U, 1024U, 4095U})
                input_[index] = 3;
        } else if (pattern_ == 3) {
            std::uint32_t seed = 0x44c05a17U;
            for (auto& count : input_) {
                seed = seed * 1664525U + 1013904223U;
                count = (seed % 13U) * 3U;
            }
        }
        layout_.writeCountFixture(0, input_);
        ticket_.begin(0);
        layout_.dispatchScan(0);
        ticket_.end();
        ticket_.submit();
    }

    private:
    GpuChunkLayout layout_;
    GpuTicket ticket_;
    std::vector<std::uint32_t> input_;
    std::size_t pattern_{};
};

} // namespace sculpt
