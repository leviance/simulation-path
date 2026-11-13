#pragma once

#include "sculpt_gpu_mesh.hpp"
#include "sculpt_active_deadline.hpp"
#include <iostream>

namespace sculpt {

class FrozenGpuField {
    public:
    FrozenGpuField(GlApi& gl, GpuBudget& budget, const GpuMeshBuilder& model)
        : ticket_(gl) {
        if (model.gpuBusy() || !model.document().stable())
            throw std::logic_error("Freezing a field requires an idle complete document");
        seed_.grid = model.settings().grid;
        const auto payload = seed_.grid.sampleCount() * sizeof(float);
        auto storage = std::make_shared<GpuBuffer>(gl, budget, payload + guardBytes);
        storage->setGuard(payload);
        gl.BindBuffer(GL_COPY_READ_BUFFER, model.document().field().id());
        gl.BindBuffer(GL_COPY_WRITE_BUFFER, storage->id());
        ticket_.begin(0);
        gl.CopyBufferSubData(GL_COPY_READ_BUFFER, GL_COPY_WRITE_BUFFER, 0, 0, static_cast<GLsizeiptr>(payload));
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        ticket_.end();
        ticket_.submit();
        seed_.buffer = std::move(storage);
    }

    bool ready() {
        if (ready_)
            return true;
        const auto elapsed = ticket_.poll();
        if (!elapsed)
            return false;
        if (!seed_.buffer->guardIntact(seed_.grid.sampleCount() * sizeof(float)))
            throw std::runtime_error("Frozen field canary is damaged");
        ready_ = true;
        return true;
    }

    const GpuFieldSeed& seed() const {
        if (!ready_)
            throw std::logic_error("An unfinished GPU copy cannot seed a new grid");
        return seed_;
    }

    private:
    GpuTicket ticket_;
    GpuFieldSeed seed_;
    bool ready_{};
};

struct SceneRequest {
    ModelSettings target;
    bool resample{};
};

class SceneChangeJob {
    public:
    SceneChangeJob(GlApi& gl, GpuBudget& budget, SceneRequest request)
        : gl_(gl), budget_(budget), request_(request) {}

    bool complete() const {
        return complete_;
    }

    bool cancelled() const {
        return cancelled_;
    }

    bool resetsCamera() const {
        return !request_.resample;
    }

    void cancel() {
        cancelRequested_ = true;
    }

    void pause(bool value) {
        deadline_.pause(value);
        paused_ = value;
    }

    double progress() const {
        if (complete_)
            return 1;
        if (!candidate_)
            return 0.02;
        if (candidate_->ready())
            return 0.99;
        if (candidate_->state() == MeshJobState::initializing)
            return 0.05 + 0.2 * candidate_->document().initializedSamples() / candidate_->settings().grid.sampleCount();
        const double fraction = static_cast<double>(candidate_->completedChunks()) / std::max<std::size_t>(1, candidate_->jobChunks());
        if (candidate_->state() == MeshJobState::counting)
            return 0.25 + 0.4 * fraction;
        if (candidate_->state() == MeshJobState::emitting)
            return 0.65 + 0.35 * fraction;
        return 0.05;
    }

    void tick(GpuMeshBuilder& previous) {
        if (complete_ || cancelled_)
            return;
        if (deadline_.expired())
            throw std::runtime_error("Grid change exceeded its 60-second deadline; keep the previous model");
        if (cancelRequested_) {
            if (candidate_) {
                candidate_->cancel();
                candidate_->tick();
                if (candidate_->gpuBusy())
                    return;
            }
            if (frozen_ && !frozen_->ready())
                return;
            cancelled_ = true;
            return;
        }
        if (paused_) {
            if (candidate_) {
                candidate_->pause(true);
                candidate_->tick();
            }
            if (frozen_)
                frozen_->ready();
            return;
        }
        if (!candidate_) {
            if (previous.gpuBusy() || previous.document().strokeOpen())
                return;
            if (request_.resample && previous.document().hasCompleteField()) {
                if (!previous.document().stable())
                    throw std::runtime_error("Previous field is not stable enough to resample");
                if (!frozen_) {
                    frozen_ = std::make_unique<FrozenGpuField>(gl_, budget_, previous);
                    return;
                }
                if (!frozen_->ready())
                    return;
                candidate_ = std::make_unique<GpuMeshBuilder>(gl_, budget_, request_.target, false, FieldInitialization::resample, frozen_->seed());
            } else {
                // Before the initial field is complete there are no committed edits to preserve.
                candidate_ = std::make_unique<GpuMeshBuilder>(gl_, budget_, request_.target);
            }
        }
        candidate_->pause(false);
        candidate_->tick();
        if (candidate_->state() == MeshJobState::failed)
            throw std::runtime_error("Candidate grid failed: " + candidate_->error());
        if (candidate_->ready())
            complete_ = true;
    }

    std::unique_ptr<GpuMeshBuilder> takeModel() {
        if (!complete_ || !candidate_ || !candidate_->ready())
            throw std::logic_error("A partial grid cannot replace the current model");
        return std::move(candidate_);
    }

    private:
    GlApi& gl_;
    GpuBudget& budget_;
    SceneRequest request_;
    std::unique_ptr<FrozenGpuField> frozen_;
    std::unique_ptr<GpuMeshBuilder> candidate_;
    ActiveDeadline deadline_{std::chrono::seconds(60)};
    bool complete_{}, cancelled_{}, cancelRequested_{}, paused_{};
};

class NativeSceneTasks {
    public:
    NativeSceneTasks(GlApi& gl, GpuBudget& budget)
        : gl_(gl), budget_(budget) {}

    bool busy() const {
        return static_cast<bool>(job_);
    }

    const std::string& status() const {
        return status_;
    }

    const std::string& error() const {
        return error_;
    }

    double progress() const {
        if (job_)
            return job_->progress();
        return 1;
    }

    bool resetsCamera() const {
        return resetCamera_;
    }

    bool paused() const {
        return paused_;
    }

    void pause(bool value) {
        paused_ = value;
    }

    int requestedSamples() const {
        if (latest_)
            return latest_->target.grid.samples;
        return 0;
    }

    bool reset(GpuMeshBuilder& current, Shape shape) {
        ModelSettings target;
        target.grid.samples = current.settings().grid.samples;
        if (job_ && latest_)
            target.grid.samples = latest_->target.grid.samples;
        target.shape = shape;
        return request(current, {target, false});
    }

    bool resolution(GpuMeshBuilder& current, int samples, float isovalue) {
        if (!job_ && samples == current.settings().grid.samples && isovalue == current.settings().isovalue) {
            status_ = "GRID ALREADY SELECTED / DATA AND HISTORY KEPT";
            return false;
        }
        ModelSettings target = current.settings();
        bool resample = true;
        if (job_ && latest_) {
            target = latest_->target;
            resample = latest_->resample;
        }
        target.grid.samples = samples;
        target.isovalue = isovalue;
        return request(current, {target, resample});
    }

    void cancel() {
        queued_.reset();
        if (job_)
            job_->cancel();
    }

    void tick(GpuMeshBuilder& current) {
        if (!job_)
            return;
        try {
            job_->pause(paused_);
            job_->tick(current);
            if (!job_->complete() && !job_->cancelled())
                return;
            if (queued_) {
                job_.reset();
                job_ = std::make_unique<SceneChangeJob>(gl_, budget_, *queued_);
                queued_.reset();
                status_ = "BUILDING MOST RECENT GRID REQUEST";
            } else if (job_->complete()) {
                resetCamera_ = job_->resetsCamera();
                replacement_ = job_->takeModel();
                status_ = "GRID READY / HISTORY CLEARED";
                std::cout << "GRID REPLACED samples=" << replacement_->settings().grid.samples << " resampled=" << !resetCamera_ << '\n';
                job_.reset();
                latest_.reset();
                paused_ = false;
            } else {
                status_ = "GRID CHANGE CANCELLED / PREVIOUS MODEL KEPT";
                retained_ = true;
                job_.reset();
                latest_.reset();
                paused_ = false;
            }
        } catch (const std::exception& error) {
            status_ = error.what();
            error_ = status_;
            std::cerr << "GRID CHANGE FAILED / PREVIOUS MODEL KEPT: " << error.what() << '\n';
            job_.reset();
            queued_.reset();
            latest_.reset();
            paused_ = false;
            retained_ = true;
        }
    }

    bool takeRetained() {
        const bool result = retained_;
        retained_ = false;
        return result;
    }

    std::unique_ptr<GpuMeshBuilder> takeModel() {
        return std::move(replacement_);
    }

    private:
    bool request(GpuMeshBuilder& current, SceneRequest next) {
        try {
            preflightSculpt(gl_, next.target);
            latest_ = next;
            if (job_) {
                queued_ = next;
                job_->cancel();
                status_ = "SUPERSEDING GRID REQUEST / KEEP PREVIOUS";
            } else {
                job_ = std::make_unique<SceneChangeJob>(gl_, budget_, next);
                paused_ = false;
                status_ = "RESET PRESET / HISTORY WILL CLEAR";
                if (next.resample)
                    status_ = "RESAMPLE GPU FIELD / PRESERVE WORLD SHAPE";
            }
            current.cancel();
            error_.clear();
            return true;
        } catch (const std::exception& error) {
            status_ = error.what();
            error_ = status_;
            return false;
        }
    }

    GlApi& gl_;
    GpuBudget& budget_;
    std::unique_ptr<SceneChangeJob> job_;
    std::optional<SceneRequest> queued_;
    std::optional<SceneRequest> latest_;
    std::unique_ptr<GpuMeshBuilder> replacement_;
    std::string status_, error_;
    bool retained_{}, resetCamera_{}, paused_{};
};

} // namespace sculpt
