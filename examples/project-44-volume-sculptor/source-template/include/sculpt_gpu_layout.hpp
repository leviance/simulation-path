#pragma once

#include "sculpt_gpu_buffer.hpp"
#include "sculpt_gpu_ticket.hpp"
#include <vector>

namespace sculpt {

// Reusable count/scan pass. It owns no vertex allocation; emitting is a separate step.
#if LAB_CHECKPOINT >= 7
class GpuChunkLayout {
    public:
    // snippet:sculpt-count-storage-allocation
    GpuChunkLayout(GlApi& gl, GpuBudget& budget, const ModelSettings& settings)
        : gl_(gl), budget_(budget), grid_(settings.grid), extract_(gl, "sculpt_extract.comp"), scan_(gl, "sculpt_scan.comp") {
        preflightSculpt(gl, settings);
        const auto chunks = chunkCount(grid_);
        counts_ = allocate(chunks * cellsPerChunk * sizeof(std::uint32_t));
        offsets_ = allocate(chunks * cellsPerChunk * sizeof(std::uint32_t));
        blocks_ = allocate(16 * sizeof(std::uint32_t));
        stats_ = allocate(chunks * sizeof(ChunkStats));
    }

    // end-snippet:sculpt-count-storage-allocation

    void gridUniforms(const Program& program) const {
        gl_.Uniform1i(program.uniform("gridN"), grid_.samples);
        gl_.Uniform3f(program.uniform("gridOrigin"), grid_.origin.x, grid_.origin.y, grid_.origin.z);
        gl_.Uniform1f(program.uniform("gridSpacing"), grid_.spacing());
    }

    void bindStorage(const GpuBuffer& field) const {
        if (field.bytes() != grid_.sampleCount() * sizeof(float) + guardBytes)
            throw std::invalid_argument("Count/scan needs the exact field allocation");
        field.bind(0);
        counts_->bind(1);
        offsets_->bind(2);
        blocks_->bind(3);
        stats_->bind(4);
        // The shared extract program also declares Mesh, but count phase never writes it.
        blocks_->bind(5);
    }

    void extractUniforms(int phase, float isovalue, std::size_t chunk, std::uint32_t generation, std::uint32_t vertexCapacity) const {
        requireChunk(chunk);
        if ((phase != 0 && phase != 1) || !std::isfinite(isovalue) || std::abs(isovalue) > 0.25F || generation == 0 || vertexCapacity > maximumChunkVertices)
            throw std::invalid_argument("Invalid extraction phase, level, generation or capacity");
        extract_.use();
        gridUniforms(extract_);
        gl_.Uniform1i(extract_.uniform("phase"), phase);
        gl_.Uniform1f(extract_.uniform("isovalue"), isovalue);
        gl_.Uniform1ui(extract_.uniform("chunk"), static_cast<GLuint>(chunk));
        gl_.Uniform1ui(extract_.uniform("generation"), generation);
#if LAB_CHECKPOINT >= 8
        gl_.Uniform1ui(extract_.uniform("vertexCapacity"), vertexCapacity);
#else
        if (phase != 0 || vertexCapacity != 0)
            throw std::invalid_argument("Vertex emission starts at checkpoint 08");
#endif
    }

    // snippet:sculpt-gpu-count-scan-submit
    void submitCount(GpuTicket& ticket, const GpuBuffer& field, float isovalue, std::size_t chunk, std::uint32_t generation) {
        if (ticket.busy())
            throw std::logic_error("Count/scan cannot replace an in-flight batch");
        requireChunk(chunk);
        bindStorage(field);
        extractUniforms(0, isovalue, chunk, generation, 0);
        ChunkStats zero;
        zero.generation = generation;
        stats_->write(chunk * sizeof(zero), std::as_bytes(std::span(&zero, 1)));
        ticket.begin(0);
        gl_.DispatchCompute(16, 1, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        ticket.end();
        ticket.begin(1);
        dispatchScan(chunk);
        ticket.end();
        ticket.submit();
    }

    // end-snippet:sculpt-gpu-count-scan-submit

    // snippet:sculpt-gpu-scan-dispatch
    void dispatchScan(std::size_t chunk) {
        requireChunk(chunk);
        counts_->bind(1);
        offsets_->bind(2);
        blocks_->bind(3);
        stats_->bind(4);
        scan_.use();
        gl_.Uniform1ui(scan_.uniform("chunk"), static_cast<GLuint>(chunk));
        for (int phase = 0; phase < 3; ++phase) {
            gl_.Uniform1i(scan_.uniform("phase"), phase);
            GLuint groups = 1;
            if (phase == 0)
                groups = 8;
            if (phase == 2)
                groups = 16;
            gl_.DispatchCompute(groups, 1, 1);
            gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        }
    }

    // end-snippet:sculpt-gpu-scan-dispatch

    // Diagnostic upload for an independent scan fixture, not runtime CPU counting.
    // The caller must own an idle ticket and provide all 4096 bounded counts.
    void writeCountFixture(std::size_t chunk, std::span<const std::uint32_t> values) {
        requireChunk(chunk);
        if (values.size() != cellsPerChunk || std::any_of(values.begin(), values.end(), [](auto count) {
                return count > 36 || count % 3 != 0;
            }))
            throw std::invalid_argument("A scan fixture needs 4096 bounded triangle-vertex counts");
        counts_->write(chunk * cellsPerChunk * sizeof(std::uint32_t), std::as_bytes(values));
        const ChunkStats zero;
        stats_->write(chunk * sizeof(zero), std::as_bytes(std::span(&zero, 1)));
    }

    // Caller first completes its ticket. Readback is bounded to one chunk.
    ChunkStats readStats(std::size_t chunk) const {
        requireChunk(chunk);
        ChunkStats result;
        stats_->read(chunk * sizeof(result), std::as_writable_bytes(std::span(&result, 1)));
        return result;
    }

    std::array<std::vector<std::uint32_t>, 2> readLayout(std::size_t chunk) const {
        requireChunk(chunk);
        std::array<std::vector<std::uint32_t>, 2> result;
        for (auto& data : result)
            data.resize(cellsPerChunk);
        const auto offset = chunk * cellsPerChunk * sizeof(std::uint32_t);
        counts_->read(offset, std::as_writable_bytes(std::span(result[0])));
        offsets_->read(offset, std::as_writable_bytes(std::span(result[1])));
        return result;
    }

    bool guardsIntact() const {
        for (const auto* source : {counts_.get(), offsets_.get(), blocks_.get(), stats_.get()})
            if (!source->guardIntact(source->bytes() - guardBytes))
                return false;
        return true;
    }

    private:
    void requireChunk(std::size_t chunk) const {
        if (chunk >= chunkCount(grid_))
            throw std::out_of_range("Count/scan chunk is outside its fixed grid");
    }

    std::unique_ptr<GpuBuffer> allocate(std::size_t payload) {
        auto result = std::make_unique<GpuBuffer>(gl_, budget_, payload + guardBytes);
        result->setGuard(payload);
        return result;
    }

    GlApi& gl_;
    GpuBudget& budget_;
    GridSpec grid_;
    Program extract_, scan_;
    std::unique_ptr<GpuBuffer> counts_, offsets_, blocks_, stats_;
};
#else
class GpuChunkLayout;
#endif

} // namespace sculpt
