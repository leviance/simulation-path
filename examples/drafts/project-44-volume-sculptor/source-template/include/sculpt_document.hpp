#pragma once

#include "sculpt_brush.hpp"
#include <optional>

namespace sculpt {

// Small CPU teaching document. The final 128^3 document will use GPU buffers, not this class.
class CpuDocument {
    public:
    explicit CpuDocument(GridSpec spec, Shape shape = Shape::sphere)
        : grid_(smallSpec(spec)), shape_(shape) {
        grid_.fill(shape);
    }

    const ScalarGrid& field() const {
        return grid_;
    }

    std::uint64_t generation() const {
        return generation_;
    }

    bool strokeActive() const {
        return owner_.has_value();
    }

    std::size_t undoCount() const {
        return undo_.size();
    }

    std::size_t redoCount() const {
        return redo_.size();
    }

    SampleBox dirty() const {
        return dirty_;
    }

    void clearDirty() {
        dirty_ = {};
    }

    void beginStroke(std::uint32_t owner, Brush brush) {
        if (owner_)
            throw std::logic_error("A stroke already has a pointer owner");
        brush.validate();
        ensureGeneration();
        before_ = grid_.values();
        beforeDirty_ = dirty_;
        brush_ = brush;
        sampler_.emplace(brush.center, brush.radius);
        owner_ = owner;
        strokeChanged_ = false;
        stamp(brush.center);
    }

    bool moveStroke(std::uint32_t owner, Vec3 target) {
        if (owner_ != owner)
            return false;
        Brush candidate = brush_;
        candidate.center = target;
        candidate.validate();
        ensureGeneration();
        // Validate/resample before editing: an excessive segment cannot apply a partial stroke.
        auto nextSampler = *sampler_;
        const auto stamps = nextSampler.advance(target);
        for (const auto point : stamps)
            stamp(point);
        sampler_ = nextSampler;
        return true;
    }

    bool endStroke(std::uint32_t owner) {
        if (owner_ != owner)
            return false;
        if (strokeChanged_) {
            undo_.push_back(std::move(before_));
            trim(undo_);
            redo_.clear();
        }
        releaseOwner();
        return true;
    }

    bool abortStroke(std::uint32_t owner) {
        if (owner_ != owner)
            return false;
        if (strokeChanged_) {
            ensureGeneration();
            grid_.replaceValues(before_);
            ++generation_;
            // Restoring a stroke is a new field version; pending jobs from it must not publish.
            markAllDirty();
            dirty_.include(beforeDirty_);
        }
        releaseOwner();
        return true;
    }

    bool undo() {
        abortOwner();
        if (undo_.empty())
            return false;
        ensureGeneration();
        redo_.push_back(grid_.values());
        grid_.replaceValues(undo_.back());
        undo_.pop_back();
        trim(redo_);
        ++generation_;
        markAllDirty();
        return true;
    }

    bool redo() {
        abortOwner();
        if (redo_.empty())
            return false;
        ensureGeneration();
        undo_.push_back(grid_.values());
        grid_.replaceValues(redo_.back());
        redo_.pop_back();
        trim(undo_);
        ++generation_;
        markAllDirty();
        return true;
    }

    void reset(GridSpec spec, Shape shape) {
        ensureGeneration();
        ScalarGrid replacement(smallSpec(spec));
        replacement.fill(shape);
        releaseOwner();
        grid_ = std::move(replacement);
        shape_ = shape;
        undo_.clear();
        redo_.clear();
        ++generation_;
        markAllDirty();
    }

    private:
    static GridSpec smallSpec(GridSpec spec) {
        spec.validate();
        if (spec.samples < 3 || spec.samples > 64)
            throw std::invalid_argument("CPU document is limited to 3..64 samples per axis");
        return spec;
    }

    void ensureGeneration() const {
        if (generation_ >= std::numeric_limits<std::uint64_t>::max() - 256)
            throw std::overflow_error("Field generation is exhausted");
    }

    static void trim(std::vector<std::vector<float>>& history) {
        while (history.size() > 4)
            history.erase(history.begin());
    }

    void stamp(Vec3 point) {
        Brush next = brush_;
        next.center = point;
        const SampleBox changed = applyBrush(grid_, next);
        if (!changed.empty) {
            dirty_.include(changed);
            strokeChanged_ = true;
            ++generation_;
        }
    }

    void markAllDirty() {
        dirty_.include(0, 0, 0);
        const int last = grid_.spec().samples - 1;
        dirty_.include(last, last, last);
    }

    void releaseOwner() {
        owner_.reset();
        sampler_.reset();
        before_.clear();
        strokeChanged_ = false;
    }

    void abortOwner() {
        if (owner_)
            abortStroke(*owner_);
    }

    ScalarGrid grid_;
    Shape shape_;
    std::uint64_t generation_{1};
    std::optional<std::uint32_t> owner_;
    std::optional<StrokeSampler> sampler_;
    Brush brush_;
    bool strokeChanged_{};
    std::vector<float> before_;
    SampleBox dirty_, beforeDirty_;
    std::vector<std::vector<float>> undo_, redo_;
};

} // namespace sculpt
