#pragma once

#include "atom_gl.hpp"
#include "atom_sampler.hpp"
#include <chrono>
#include <memory>
#include <vector>

namespace atom {

struct MemoryBudget {
    std::size_t reserved{}, peak{};
    static constexpr std::size_t limit = 512ULL * 1024 * 1024;

    void acquire(std::size_t bytes) {
        if (bytes > limit || reserved > limit - bytes)
            throw std::runtime_error("GPU budget refused; keep the last-good cloud");
        reserved += bytes;
        peak = std::max(peak, reserved);
    }

    void release(std::size_t bytes) {
        reserved -= bytes;
    }
};

// One buffer reservation includes its guard. Failure unwinds the reservation.
class Buffer {
    public:
    Buffer(GlApi& gl, MemoryBudget& budget, std::size_t bytes, const void* data = nullptr) :
        gl_(gl),
        budget_(budget),
        bytes_(bytes) {
        budget_.acquire(bytes);
        try {
            gl_.GenBuffers(1, &id_);
            gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, id_);
            gl_.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(bytes), data, GL_DYNAMIC_DRAW);
            GLint64 actual{};
            gl_.GetBufferParameteri64v(GL_SHADER_STORAGE_BUFFER, GL_BUFFER_SIZE, &actual);
            if (!id_ || gl_.GetError() != GL_NO_ERROR || actual != static_cast<GLint64>(bytes))
                throw std::runtime_error("Driver refused the requested GPU buffer");
        } catch (...) {
            if (id_)
                gl_.DeleteBuffers(1, &id_);
            budget_.release(bytes_);
            throw;
        }
    }

    ~Buffer() {
        gl_.DeleteBuffers(1, &id_);
        budget_.release(bytes_);
    }

    Buffer(const Buffer&) = delete;
    Buffer& operator=(const Buffer&) = delete;

    GLuint id() const {
        return id_;
    }

    std::size_t byteSize() const {
        return bytes_;
    }

    void bind(GLuint binding) const {
        gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, binding, id_);
    }

    void read(std::size_t offset, std::size_t bytes, void* destination) const {
        if (offset > bytes_ || bytes > bytes_ - offset)
            throw std::out_of_range("Bounded buffer read");
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, id_);
        gl_.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, offset, bytes, destination);
        if (gl_.GetError() != GL_NO_ERROR)
            throw std::runtime_error("GPU readback failed");
    }

    private:
    GlApi& gl_;
    MemoryBudget& budget_;
    std::size_t bytes_{};
    GLuint id_{};
};

enum class CloudPhase {
    generating,
    ready,
    cancelled,
    failed
};

#if LAB_CHECKPOINT >= 4
// Checkpoint 4 replaces the supplied interface below with real GPU generation.
// Checkpoint 5 then replaces one small dispatch with the bounded batch sequence.
// A candidate is invisible until every requested point has passed validation.
class GpuCloud {
    public:
    GpuCloud(GlApi& gl, MemoryBudget& budget, SamplingConfig config, SamplingMode mode = SamplingMode::weighted) :
        gl_(gl),
        config_(config),
        mode_(mode),
        program_(gl, "sample.comp") {
        config_.validate();
#if LAB_CHECKPOINT < 5
        if (config_.count > 16384)
            throw std::invalid_argument("Checkpoint 4 limits GPU generation to 16384 points");
#endif
        const auto begin = std::chrono::steady_clock::now();
        tables_ = buildTables(config_);
        tableMs_ = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - begin).count();
        const auto uploadBegin = std::chrono::steady_clock::now();
        radial_ = std::make_unique<Buffer>(gl_, budget, tables_.radialCdf.size() * sizeof(float), tables_.radialCdf.data());
        angular_ = std::make_unique<Buffer>(gl_, budget, tables_.angularCdf.size() * sizeof(float), tables_.angularCdf.data());
        const std::size_t bytes = static_cast<std::size_t>(config_.count) * sizeof(PointRecord);
        GLint64 maximumBlock{};
        gl_.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &maximumBlock);
        if (maximumBlock <= 0 || bytes + 64 > static_cast<std::size_t>(maximumBlock))
            throw std::runtime_error("Point SSBO exceeds this driver's per-block limit; last-good retained");
        points_ = std::make_unique<Buffer>(gl_, budget, bytes + 64);
        const std::array<std::uint32_t, 4> zero{};
        counters_ = std::make_unique<Buffer>(gl_, budget, sizeof(zero), zero.data());
        guard_.fill(0x6a19d3b7U);
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, points_->id());
        gl_.BufferSubData(GL_SHADER_STORAGE_BUFFER, bytes, 64, guard_.data());
        gl_.GenQueries(1, &query_);
        if (!query_ || gl_.GetError() != GL_NO_ERROR) {
            if (query_)
                gl_.DeleteQueries(1, &query_);
            query_ = 0;
            throw std::runtime_error("Could not prepare finite sampling job");
        }
        allocateUploadSubmitMs_ = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - uploadBegin).count();
    }

    ~GpuCloud() {
        if (fence_)
            gl_.DeleteSync(fence_);
        if (query_)
            gl_.DeleteQueries(1, &query_);
    }

    GpuCloud(const GpuCloud&) = delete;
    GpuCloud& operator=(const GpuCloud&) = delete;

    const SamplingConfig& config() const {
        return config_;
    }

    SamplingMode mode() const {
        return mode_;
    }

    const SamplingTables& tables() const {
        return tables_;
    }

    const Buffer& points() const {
        return *points_;
    }

    std::size_t ownedBufferBytes() const {
        return radial_->byteSize() + angular_->byteSize() + points_->byteSize() + counters_->byteSize();
    }

    CloudPhase phase() const {
        return phase_;
    }

    bool busy() const {
        return fence_ != nullptr;
    }

    bool ready() const {
        return phase_ == CloudPhase::ready;
    }

    bool paused() const {
        return paused_;
    }

    void pause(bool value) {
        paused_ = value;
    }

    void cancel() {
        cancelled_ = true;
        if (!busy())
            phase_ = CloudPhase::cancelled;
    }

    std::uint32_t generated() const {
        return counts_[0];
    }

    std::uint32_t accepted() const {
        return counts_[1];
    }

    std::uint32_t invalid() const {
        return counts_[2];
    }

    double sampleMs() const {
        return sampleMs_;
    }

    double tableMs() const {
        return tableMs_;
    }

    double allocateUploadSubmitMs() const {
        return allocateUploadSubmitMs_;
    }

    double generationWallMs() const {
        return generationWallMs_;
    }

    const std::string& error() const {
        return error_;
    }

    // snippet:atom-gpu-batch
    void tick() {
        try {
            if (fence_) {
                const auto status = gl_.ClientWaitSync(fence_, 0, 0);
                if (status == GL_WAIT_FAILED)
                    throw std::runtime_error("Sampling fence failed");
                if (status == GL_TIMEOUT_EXPIRED) {
                    if (std::chrono::steady_clock::now() - submitted_ > std::chrono::seconds(3))
                        throw std::runtime_error("Sampling fence exceeded three seconds");
                    return;
                }
                gl_.DeleteSync(fence_);
                fence_ = nullptr;
                GLuint64 elapsed{};
                gl_.GetQueryObjectui64v(query_, GL_QUERY_RESULT, &elapsed);
                sampleMs_ += static_cast<double>(elapsed) / 1000000.0;
                counters_->read(0, sizeof(counts_), counts_.data());
                if (counts_[2] || counts_[0] != next_ || counts_[1] != next_)
                    throw std::runtime_error("GPU generation was incomplete or produced invalid points");
            }
            if (cancelled_) {
                phase_ = CloudPhase::cancelled;
                return;
            }
            if (phase_ != CloudPhase::generating || paused_)
                return;
            if (next_ == config_.count) {
                std::array<std::uint32_t, 16> actual{};
                points_->read(static_cast<std::size_t>(config_.count) * sizeof(PointRecord), 64, actual.data());
                if (actual != guard_)
                    throw std::runtime_error("Sampling wrote outside its point capacity");
                generationWallMs_ = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - started_).count();
                phase_ = CloudPhase::ready;
                return;
            }
#if LAB_CHECKPOINT >= 5
            const auto batchCount = std::min<std::uint32_t>(32768, config_.count - next_);
#else
            // One small dispatch first; later the same path advances by batches.
            const auto batchCount = config_.count - next_;
#endif
            radial_->bind(0);
            angular_->bind(1);
            points_->bind(2);
            counters_->bind(3);
            program_.use();
            uintUniform("pointCount", config_.count);
            uintUniform("startIndex", next_);
            uintUniform("batchCount", batchCount);
            uintUniform("seed", config_.seed);
            uintUniform("radialBins", config_.radialBins);
            uintUniform("muBins", config_.muBins);
            uintUniform("phiBins", config_.phiBins);
            gl_.Uniform1i(program_.uniform("orbital"), static_cast<int>(config_.orbital));
            gl_.Uniform1i(program_.uniform("samplingMode"), static_cast<int>(mode_));
            gl_.Uniform1f(program_.uniform("rMax"), config_.radius);
            gl_.BeginQuery(GL_TIME_ELAPSED, query_);
            gl_.DispatchCompute((batchCount + 255) / 256, 1, 1);
            gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_VERTEX_ATTRIB_ARRAY_BARRIER_BIT);
            gl_.EndQuery(GL_TIME_ELAPSED);
            fence_ = gl_.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
            gl_.Flush();
            if (!fence_ || gl_.GetError() != GL_NO_ERROR)
                throw std::runtime_error("Sampling dispatch failed");
            next_ += batchCount;
            submitted_ = std::chrono::steady_clock::now();
        } catch (const std::exception& error) {
            // Abandon the sync without a blocking wait. GL defers destruction of
            // resources still in flight; a failed candidate must not stay busy.
            if (fence_) {
                gl_.DeleteSync(fence_);
                fence_ = nullptr;
            }
            error_ = error.what();
            phase_ = CloudPhase::failed;
        }
    }

    // end-snippet:atom-gpu-batch

    // Validation only: the interactive path never downloads a million positions.
    std::vector<PointRecord> referenceReadback(std::uint32_t first, std::uint32_t count) const {
        if (!ready() || count > 16384 || first > config_.count || count > config_.count - first)
            throw std::invalid_argument("Use bounded validation readback on a current cloud");
        std::vector<PointRecord> result(count);
        points_->read(static_cast<std::size_t>(first) * sizeof(PointRecord), count * sizeof(PointRecord), result.data());
        return result;
    }

    private:
    void uintUniform(const char* name, std::uint32_t value) {
        gl_.Uniform1ui(program_.uniform(name), value);
    }

    GlApi& gl_;
    SamplingConfig config_;
    SamplingMode mode_;
    SamplingTables tables_;
    // Member order includes shader setup in wall time. Wall time also contains
    // UI batch cadence, fence polling and any pause; it is not GPU kernel time.
    const std::chrono::steady_clock::time_point started_{std::chrono::steady_clock::now()};
    Program program_;
    std::unique_ptr<Buffer> radial_, angular_, points_, counters_;
    std::array<std::uint32_t, 4> counts_{};
    std::array<std::uint32_t, 16> guard_{};
    GLuint query_{};
    GLsync fence_{};
    std::uint32_t next_{};
    CloudPhase phase_{CloudPhase::generating};
    bool cancelled_{}, paused_{};
    double tableMs_{}, sampleMs_{}, allocateUploadSubmitMs_{}, generationWallMs_{};
    std::string error_;
    std::chrono::steady_clock::time_point submitted_;
};
#else
// Provided interface for the renderer/app scaffold in lessons 1-3. This is not
// an implementation to copy or enable: lesson 4 replaces it with the class above.
// Construction is an error, so an early checkpoint cannot silently claim GPU data.
class GpuCloud {
    public:
    GpuCloud(GlApi&, MemoryBudget&, SamplingConfig config, SamplingMode mode = SamplingMode::weighted) :
        config_(config),
        mode_(mode) {
        throw std::logic_error("GPU sampling is introduced at checkpoint 4");
    }

    const SamplingConfig& config() const {
        return config_;
    }

    SamplingMode mode() const {
        return mode_;
    }

    const SamplingTables& tables() const {
        return tables_;
    }

    const Buffer& points() const {
        throw std::logic_error("There is no GPU point buffer before checkpoint 4");
    }

    std::size_t ownedBufferBytes() const {
        return 0;
    }

    CloudPhase phase() const {
        return CloudPhase::failed;
    }

    bool busy() const {
        return false;
    }

    bool ready() const {
        return false;
    }

    bool paused() const {
        return false;
    }

    void pause(bool) {
    }

    void cancel() {
    }

    void tick() {
    }

    std::uint32_t generated() const {
        return 0;
    }

    std::uint32_t accepted() const {
        return 0;
    }

    std::uint32_t invalid() const {
        return 0;
    }

    double sampleMs() const {
        return 0;
    }

    double tableMs() const {
        return 0;
    }

    double allocateUploadSubmitMs() const {
        return 0;
    }

    double generationWallMs() const {
        return 0;
    }

    const std::string& error() const {
        return error_;
    }

    std::vector<PointRecord> referenceReadback(std::uint32_t, std::uint32_t) const {
        throw std::logic_error("GPU readback is introduced at checkpoint 4");
    }

    private:
    SamplingConfig config_;
    SamplingMode mode_;
    SamplingTables tables_;
    std::string error_{"GPU sampling is introduced at checkpoint 4"};
};
#endif

} // namespace atom
