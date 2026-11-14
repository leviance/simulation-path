#pragma once

#include "sculpt_brush.hpp"
#include "sculpt_gpu_buffer.hpp"
#include "sculpt_gpu_ticket.hpp"
#include <cstddef>
#include <deque>
#include <optional>

namespace sculpt {

enum class FieldState { initializing,
                        loading,
                        idle,
                        editing,
                        restoring,
                        failed };

enum class FieldInitialization { preset,
                                 archive,
                                 resample };

// snippet:sculpt-gpu-stamp-layout
struct GpuStamp {
    std::array<float, 4> centerRadius{};
    std::array<float, 4> strengthMode{};
};

static_assert(sizeof(GpuStamp) == 32);
static_assert(offsetof(GpuStamp, strengthMode) == 16);

// end-snippet:sculpt-gpu-stamp-layout

inline SampleBox brushBounds(const GridSpec& grid, const Brush& brush) {
    brush.validate();
    const Vec3 radius{brush.radius, brush.radius, brush.radius};
    const auto low = grid.gridFromWorld(brush.center - radius);
    const auto high = grid.gridFromWorld(brush.center + radius);
    const std::array<float, 3> minimum{low.x, low.y, low.z};
    const std::array<float, 3> maximum{high.x, high.y, high.z};
    SampleBox result;
    for (int axis = 0; axis < 3; ++axis) {
        if (maximum[axis] < 1 || minimum[axis] > grid.samples - 2)
            return {};
        result.low[axis] = std::clamp(static_cast<int>(std::floor(minimum[axis])), 1, grid.samples - 2);
        result.high[axis] = std::clamp(static_cast<int>(std::ceil(maximum[axis])), 1, grid.samples - 2);
    }
    result.empty = false;
    return result;
}

// Owns the real GPU field. History is device-to-device, never a full-field CPU edit.
#if LAB_CHECKPOINT >= 6
class GpuFieldDocument {
    public:
    GpuFieldDocument(GlApi& gl, GpuBudget& budget, ModelSettings settings, bool plane = false, FieldInitialization initialization = FieldInitialization::preset, std::optional<GpuFieldSeed> seed = {})
        : gl_(gl), budget_(budget), settings_(settings), program_(gl, "sculpt_field.comp"), ticket_(gl), seed_(std::move(seed)), plane_(plane) {
        settings_.validate();
#if LAB_CHECKPOINT < 10
        if (initialization == FieldInitialization::resample)
            throw std::invalid_argument("GPU resolution resampling starts at checkpoint 10");
#endif
        if (initialization == FieldInitialization::resample) {
            if (plane_ || !seed_ || !seed_->buffer)
                throw std::invalid_argument("GPU resampling requires one immutable field snapshot");
            seed_->grid.validate();
            const auto& source = seed_->grid;
            const auto& target = settings_.grid;
            if (source.origin.x != target.origin.x || source.origin.y != target.origin.y || source.origin.z != target.origin.z || source.extent != target.extent || seed_->buffer->bytes() != source.sampleCount() * sizeof(float) + guardBytes)
                throw std::invalid_argument("Resolution resampling must preserve the world domain and exact source allocation");
        } else if (seed_)
            throw std::invalid_argument("A field seed is only valid for the resampling path");
        // snippet:sculpt-gpu-field-allocation
        field_ = allocate(settings_.grid.sampleCount() * sizeof(float));
        stamps_ = allocate(8 * sizeof(GpuStamp));
        editSummary_ = allocate(4 * sizeof(std::uint32_t));
        // end-snippet:sculpt-gpu-field-allocation
        if (initialization == FieldInitialization::archive) {
            if (plane_)
                throw std::invalid_argument("An archive cannot also initialize an analytic plane fixture");
            state_ = FieldState::loading;
        }
    }

    const GpuBuffer& field() const {
        return *field_;
    }

    FieldState state() const {
        return state_;
    }

    bool stable() const {
        return state_ == FieldState::idle && !ticket_.busy();
    }

    bool hasCompleteField() const {
        return initialized_ == settings_.grid.sampleCount();
    }

    std::size_t initializedSamples() const {
        return initialized_;
    }

    bool busy() const {
        return ticket_.busy();
    }

    bool strokeOpen() const {
        return state_ == FieldState::editing || state_ == FieldState::restoring;
    }

    bool owns(std::uint32_t owner) const {
        return owner_ == owner;
    }

    std::uint32_t revision() const {
        return revision_;
    }

    std::size_t undoCount() const {
        return undo_.size();
    }

    std::size_t redoCount() const {
        return redo_.size();
    }

    std::size_t queuedStamps() const {
        return pending_.size() + batch_.size();
    }

    std::uint64_t changedSampleWrites() const {
        return changedSampleWrites_;
    }

    const PassTimes& times() const {
        return times_;
    }

    SampleBox takeDirty() {
        const auto result = dirty_;
        dirty_ = {};
        return result;
    }

    bool beginStroke(std::uint32_t owner, Brush brush) {
        if (!stable())
            return false;
        brush.validate();
        ensureRevision();
        // Allocate before capture or mutation. A failed allocation leaves the document untouched.
        auto snapshot = allocate(settings_.grid.sampleCount() * sizeof(float));
        before_ = std::move(snapshot);
        brush_ = brush;
        owner_ = owner;
        sampler_.emplace(brush.center, brush.radius);
        pending_.push_back(brush);
        beforeReady_ = false;
        strokeChanged_ = false;
        changedSampleWrites_ = 0;
        aborting_ = false;
        state_ = FieldState::editing;
        times_.brush = 0;
        return true;
    }

    bool moveStroke(std::uint32_t owner, Vec3 point) {
        if (!owns(owner))
            return false;
        Brush next = brush_;
        next.center = point;
        next.validate();
        auto sampler = *sampler_;
        const auto points = sampler.advance(point);
        if (points.size() + queuedStamps() > 512)
            throw std::overflow_error("Stroke queue is full; this input segment was not applied");
        for (const auto center : points) {
            next.center = center;
            pending_.push_back(next);
        }
        sampler_ = sampler;
        return true;
    }

    bool endStroke(std::uint32_t owner) {
        if (!owns(owner))
            return false;
        owner_.reset();
        sampler_.reset();
        return true;
    }

    void abortStroke() {
        if (!strokeOpen())
            return;
        owner_.reset();
        sampler_.reset();
        pending_.clear();
        aborting_ = true;
    }

    bool undo() {
        return restoreHistory(undo_, redo_);
    }

    bool redo() {
        return restoreHistory(redo_, undo_);
    }

    void appendImport(std::span<const float> values) {
        if (state_ != FieldState::loading || ticket_.busy() || values.empty() || values.size() > 65536 || values.size() > settings_.grid.sampleCount() - initialized_)
            throw std::logic_error("Field import needs one idle, exact, bounded batch");
        for (const auto value : values)
            if (!std::isfinite(value) || std::abs(value) > 32)
                throw std::invalid_argument("Field import contains a nonfinite or out-of-range sample");
        kind_ = Batch::upload;
        submittedSamples_ = values.size();
        ticket_.begin(0);
        field_->write(initialized_ * sizeof(float), std::as_bytes(values));
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        ticket_.end();
        ticket_.submit();
    }

    void finishImport() {
        // The file job calls this only after validating its complete payload, checksum and EOF.
        if (state_ != FieldState::loading || ticket_.busy() || initialized_ != settings_.grid.sampleCount())
            throw std::logic_error("An incomplete field import cannot be published");
        state_ = FieldState::idle;
        markAllDirty();
    }

    void tick(bool paused = false) {
        if (state_ == FieldState::failed)
            return;
        try {
            if (ticket_.busy()) {
                const auto elapsed = ticket_.poll();
                if (!elapsed)
                    return;
                acceptBatch((*elapsed)[0]);
            }
            if (paused && !aborting_)
                return;
            if (state_ == FieldState::initializing)
                submitInitialize();
            else if (state_ == FieldState::editing)
                tickStroke();
        } catch (...) {
            owner_.reset();
            sampler_.reset();
            state_ = FieldState::failed;
            throw;
        }
    }

    bool guardsIntact() const {
        if (ticket_.busy())
            throw std::logic_error("Field guards require a completed GPU batch");
        for (const auto* source : {field_.get(), stamps_.get(), editSummary_.get(), before_.get()})
            if (source && !source->guardIntact(source->bytes() - guardBytes))
                return false;
        for (const auto* history : {&undo_, &redo_})
            for (const auto& snapshot : *history)
                if (!snapshot->guardIntact(snapshot->bytes() - guardBytes))
                    return false;
        return true;
    }

    private:
    enum class Batch { initialize,
                       upload,
                       snapshot,
                       brush,
                       restore };

    std::unique_ptr<GpuBuffer> allocate(std::size_t payload) {
        auto result = std::make_unique<GpuBuffer>(gl_, budget_, payload + guardBytes);
        result->setGuard(payload);
        return result;
    }

    void ensureRevision() const {
        if (revision_ == std::numeric_limits<std::uint32_t>::max())
            throw std::overflow_error("Field revision is exhausted");
    }

    void markAllDirty() {
        dirty_.include(0, 0, 0);
        const int last = settings_.grid.samples - 1;
        dirty_.include(last, last, last);
    }

    bool restoreHistory(std::vector<std::unique_ptr<GpuBuffer>>& source, std::vector<std::unique_ptr<GpuBuffer>>& destination) {
        if (!stable() || source.empty())
            return false;
        ensureRevision();
        // Swapping complete GPU snapshots is byte-exact; no upload or CPU extraction is needed.
        destination.push_back(std::move(field_));
        field_ = std::move(source.back());
        source.pop_back();
        ++revision_;
        markAllDirty();
        return true;
    }

    void uniforms() {
        program_.use();
        const auto& grid = settings_.grid;
        gl_.Uniform1i(program_.uniform("gridN"), grid.samples);
        gl_.Uniform3f(program_.uniform("gridOrigin"), grid.origin.x, grid.origin.y, grid.origin.z);
        gl_.Uniform1f(program_.uniform("gridSpacing"), grid.spacing());
        field_->bind(0);
        stamps_->bind(6);
        editSummary_->bind(7);
#if LAB_CHECKPOINT >= 10
        field_->bind(1);
        if (seed_)
            seed_->buffer->bind(1);
        GridSpec source = settings_.grid;
        if (seed_)
            source = seed_->grid;
        gl_.Uniform1i(program_.uniform("sourceN"), source.samples);
        gl_.Uniform3f(program_.uniform("sourceOrigin"), source.origin.x, source.origin.y, source.origin.z);
        gl_.Uniform1f(program_.uniform("sourceSpacing"), source.spacing());
#endif
    }

    // snippet:sculpt-gpu-field-initialize
    void submitInitialize() {
        uniforms();
        int operation = 0;
#if LAB_CHECKPOINT >= 10
        if (seed_)
            operation = 2;
#endif
        gl_.Uniform1i(program_.uniform("operation"), operation);
        int shape = static_cast<int>(settings_.shape);
        if (plane_)
            shape = 3;
        gl_.Uniform1i(program_.uniform("shape"), shape);
        gl_.Uniform1ui(program_.uniform("firstSample"), static_cast<GLuint>(initialized_));
        submittedSamples_ = std::min<std::size_t>(65536, settings_.grid.sampleCount() - initialized_);
        dispatch(Batch::initialize);
    }

    // end-snippet:sculpt-gpu-field-initialize

    // snippet:sculpt-gpu-field-dispatch
    void dispatch(Batch kind) {
        gl_.Uniform1ui(program_.uniform("sampleBatch"), static_cast<GLuint>(submittedSamples_));
        kind_ = kind;
        ticket_.begin(0);
        gl_.DispatchCompute(static_cast<GLuint>((submittedSamples_ + 255) / 256), 1, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        ticket_.end();
        ticket_.submit();
    }

    // end-snippet:sculpt-gpu-field-dispatch

    void copy(const GpuBuffer& source, const GpuBuffer& destination, Batch kind) {
        kind_ = kind;
        gl_.BindBuffer(GL_COPY_READ_BUFFER, source.id());
        gl_.BindBuffer(GL_COPY_WRITE_BUFFER, destination.id());
        ticket_.begin(0);
        gl_.CopyBufferSubData(GL_COPY_READ_BUFFER, GL_COPY_WRITE_BUFFER, 0, 0, static_cast<GLsizeiptr>(settings_.grid.sampleCount() * sizeof(float)));
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        ticket_.end();
        ticket_.submit();
    }

    void acceptBatch(double milliseconds) {
        if (kind_ == Batch::initialize) {
            times_.field += milliseconds;
            initialized_ += submittedSamples_;
            if (initialized_ == settings_.grid.sampleCount()) {
                seed_.reset();
                state_ = FieldState::idle;
                markAllDirty();
            }
        } else if (kind_ == Batch::upload) {
            times_.upload += milliseconds;
            initialized_ += submittedSamples_;
        } else if (kind_ == Batch::snapshot) {
            times_.history += milliseconds;
            beforeReady_ = true;
        } else if (kind_ == Batch::brush) {
            times_.brush += milliseconds;
            std::array<std::uint32_t, 4> summary{};
            editSummary_->read(0, std::as_writable_bytes(std::span(summary)));
            if (summary[1] != 0 || summary[2] != submittedSamples_ || summary[0] > submittedSamples_)
                throw std::runtime_error("GPU brush returned an invalid sample-write summary");
            if (summary[0] != 0) {
                // snippet:sculpt-mark-edited-region
                // A changed partial batch must roll back too, not just a complete brush region.
                dirty_.include(editBounds_);
                strokeChanged_ = true;
                changedSampleWrites_ += summary[0];
                // end-snippet:sculpt-mark-edited-region
            }
            editCursor_ += submittedSamples_;
            if (editCursor_ == editSamples_) {
                batch_.clear();
                editCursor_ = 0;
            }
        } else {
            times_.history += milliseconds;
            ++revision_;
            markAllDirty();
            before_.reset();
            batch_.clear();
            state_ = FieldState::idle;
        }
    }

    void tickStroke() {
        if (aborting_) {
            batch_.clear();
            if (!beforeReady_ || !strokeChanged_) {
                before_.reset();
                state_ = FieldState::idle;
                return;
            }
            state_ = FieldState::restoring;
            copy(*before_, *field_, Batch::restore);
            return;
        }
        if (!beforeReady_) {
            copy(*field_, *before_, Batch::snapshot);
            return;
        }
        if (batch_.empty() && !pending_.empty())
            prepareBrushBatch();
        if (!batch_.empty()) {
            submitBrush();
            return;
        }
        if (!owner_) {
            if (strokeChanged_) {
                undo_.push_back(std::move(before_));
                if (undo_.size() > 4)
                    undo_.erase(undo_.begin());
                redo_.clear();
                ++revision_;
            }
            before_.reset();
            state_ = FieldState::idle;
        }
    }

    void prepareBrushBatch() {
        editBounds_ = {};
        std::array<GpuStamp, 8> records{};
        while (!pending_.empty() && batch_.size() < records.size()) {
            const auto brush = pending_.front();
            pending_.pop_front();
            const auto bounds = brushBounds(settings_.grid, brush);
            if (bounds.empty)
                continue;
            records[batch_.size()] = {{brush.center.x, brush.center.y, brush.center.z, brush.radius}, {brush.strength, static_cast<float>(brush.mode), 0, 0}};
            batch_.push_back(brush);
            editBounds_.include(bounds);
        }
        if (batch_.empty())
            return;
        stamps_->write(0, std::as_bytes(std::span(records)));
        editSamples_ = 1;
        for (int axis = 0; axis < 3; ++axis)
            editSamples_ *= static_cast<std::size_t>(editBounds_.high[axis] - editBounds_.low[axis] + 1);
        editCursor_ = 0;
    }

    // snippet:sculpt-gpu-brush-dispatch
    void submitBrush() {
        uniforms();
        const std::array<std::uint32_t, 4> zero{};
        editSummary_->write(0, std::as_bytes(std::span(zero)));
        gl_.Uniform1i(program_.uniform("operation"), 1);
        gl_.Uniform1i(program_.uniform("stampCount"), static_cast<int>(batch_.size()));
        const auto& low = editBounds_.low;
        const auto& high = editBounds_.high;
        gl_.Uniform3f(program_.uniform("regionLow"), static_cast<float>(low[0]), static_cast<float>(low[1]), static_cast<float>(low[2]));
        gl_.Uniform3f(program_.uniform("regionSize"), static_cast<float>(high[0] - low[0] + 1), static_cast<float>(high[1] - low[1] + 1), static_cast<float>(high[2] - low[2] + 1));
        gl_.Uniform1ui(program_.uniform("firstSample"), static_cast<GLuint>(editCursor_));
        submittedSamples_ = std::min<std::size_t>(65536, editSamples_ - editCursor_);
        dispatch(Batch::brush);
    }

    // end-snippet:sculpt-gpu-brush-dispatch

    GlApi& gl_;
    GpuBudget& budget_;
    ModelSettings settings_;
    Program program_;
    GpuTicket ticket_;
    std::optional<GpuFieldSeed> seed_;
    std::unique_ptr<GpuBuffer> field_, stamps_, editSummary_, before_;
    std::vector<std::unique_ptr<GpuBuffer>> undo_, redo_;
    FieldState state_{FieldState::initializing};
    Batch kind_{Batch::initialize};
    PassTimes times_;
    std::uint32_t revision_{1};
    std::uint64_t changedSampleWrites_{};
    std::size_t initialized_{}, submittedSamples_{}, editCursor_{}, editSamples_{};
    std::optional<std::uint32_t> owner_;
    std::optional<StrokeSampler> sampler_;
    Brush brush_;
    std::deque<Brush> pending_;
    std::vector<Brush> batch_;
    SampleBox dirty_, editBounds_;
    bool beforeReady_{}, strokeChanged_{}, aborting_{}, plane_{};
};
#else
class GpuFieldDocument;
#endif

} // namespace sculpt
