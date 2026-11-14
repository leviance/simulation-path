#pragma once

#include "atom_gpu.hpp"
#include <optional>

namespace atom {

#if LAB_CHECKPOINT >= 5
// Lesson 5 replaces the one-cloud path below with candidate/last-good ownership.
// One pane owns one active cloud and at most one candidate. Requests made during
// a flight replace the queued request, never the label of the visible cloud.
class CloudPane {
    public:
    CloudPane(GlApi& gl, MemoryBudget& budget) :
        gl_(gl),
        budget_(budget) {
    }

    const GpuCloud* active() const {
        return active_.get();
    }

    const GpuCloud* candidate() const {
        return candidate_.get();
    }

    const std::string& notice() const {
        return notice_;
    }

    bool pending() const {
        return candidate_ || queued_;
    }

    std::uint64_t generation() const {
        return generation_;
    }

    bool current() const {
        return active_ && generation_ == requested_;
    }

    const SamplingConfig& desiredConfig() const {
        return desired_;
    }

    // snippet:atom-request-cloud
    void request(SamplingConfig config, SamplingMode mode) {
        config.validate();
        if (mode != SamplingMode::weighted && config.count > 16384)
            throw std::invalid_argument("Wrong-sampler experiments are limited to 16384 points");
        queued_ = Request{config, mode, ++requested_};
        desired_ = config;
        if (candidate_)
            candidate_->cancel();
        notice_ = "REQUEST QUEUED / LAST-GOOD RETAINED";
    }

    // end-snippet:atom-request-cloud
    void cancel() {
        queued_.reset();
        if (candidate_)
            candidate_->cancel();
        notice_ = "CANCELLED / LAST-GOOD RETAINED";
    }

    void pause() {
        paused_ = !paused_;
        if (candidate_)
            candidate_->pause(paused_);
    }

    // snippet:atom-publish-cloud
    bool tick(bool allowPublish = true) {
        if (candidate_) {
            candidate_->tick();
            if (candidate_->ready() && allowPublish) {
                if (candidateGeneration_ == requested_ && !queued_) {
                    active_ = std::move(candidate_);
                    generation_ = candidateGeneration_;
                    notice_.clear();
                    return true;
                }
                candidate_.reset();
            } else if ((candidate_->phase() == CloudPhase::cancelled || candidate_->phase() == CloudPhase::failed) && !candidate_->busy()) {
                if (candidate_->phase() == CloudPhase::failed)
                    notice_ = candidate_->error();
                candidate_.reset();
            }
        }
        if (!candidate_ && queued_ && !paused_) {
            const auto request = *queued_;
            queued_.reset();
            try {
                candidate_ = std::make_unique<GpuCloud>(gl_, budget_, request.config, request.mode);
                candidateGeneration_ = request.generation;
            } catch (const std::exception& error) {
                notice_ = error.what();
            }
        }
        return false;
    }

    // end-snippet:atom-publish-cloud
    private:
    struct Request {
        SamplingConfig config;
        SamplingMode mode;
        std::uint64_t generation;
    };

    GlApi& gl_;
    MemoryBudget& budget_;
    std::unique_ptr<GpuCloud> active_, candidate_;
    std::optional<Request> queued_;
    std::uint64_t requested_{}, candidateGeneration_{}, generation_{};
    bool paused_{};
    SamplingConfig desired_;
    std::string notice_;
};
#else
// Checkpoint 4 deliberately owns only one small cloud. A new request removes the
// previous cloud: retaining a last-good while a candidate runs is lesson 5's
// addition, not a hidden feature already completed in the supplied interface.
class CloudPane {
    public:
    CloudPane(GlApi& gl, MemoryBudget& budget) :
        gl_(gl),
        budget_(budget) {
    }

    const GpuCloud* active() const {
        if (published_ && cloud_ && cloud_->ready())
            return cloud_.get();
        return nullptr;
    }

    const GpuCloud* candidate() const {
        if (!published_)
            return cloud_.get();
        return nullptr;
    }

    const std::string& notice() const {
        return notice_;
    }

    bool pending() const {
        return cloud_ && !published_;
    }

    std::uint64_t generation() const {
        return generation_;
    }

    bool current() const {
        return active() && generation_ == requested_;
    }

    const SamplingConfig& desiredConfig() const {
        return desired_;
    }

    // snippet:atom-request-single-cloud
    void request(SamplingConfig config, SamplingMode mode) {
        config.validate();
        if (config.count > 16384)
            throw std::invalid_argument("The first GPU checkpoint supports at most 16384 points");
        desired_ = config;
        ++requested_;
        published_ = false;
        cloud_.reset();
        notice_ = "ONE SMALL GPU CLOUD / NO LAST-GOOD YET";
        try {
            cloud_ = std::make_unique<GpuCloud>(gl_, budget_, config, mode);
            cloud_->pause(paused_);
        } catch (const std::exception& error) {
            notice_ = error.what();
        }
    }

    // end-snippet:atom-request-single-cloud

    void cancel() {
        if (cloud_ && !published_)
            cloud_->cancel();
        notice_ = "GENERATION CANCELLED / NO LAST-GOOD YET";
    }

    void pause() {
        paused_ = !paused_;
        if (cloud_ && !published_)
            cloud_->pause(paused_);
    }

    // snippet:atom-publish-single-cloud
    bool tick(bool allowPublish = true) {
        if (!cloud_ || published_)
            return false;
        cloud_->tick();
        if (cloud_->phase() == CloudPhase::failed || cloud_->phase() == CloudPhase::cancelled) {
            if (cloud_->phase() == CloudPhase::failed)
                notice_ = cloud_->error();
            if (!cloud_->busy())
                cloud_.reset();
            return false;
        }
        if (cloud_->ready() && allowPublish) {
            generation_ = requested_;
            published_ = true;
            notice_.clear();
            return true;
        }
        return false;
    }

    // end-snippet:atom-publish-single-cloud

    private:
    GlApi& gl_;
    MemoryBudget& budget_;
    std::unique_ptr<GpuCloud> cloud_;
    SamplingConfig desired_;
    std::uint64_t requested_{}, generation_{};
    bool paused_{}, published_{};
    std::string notice_;
};
#endif

} // namespace atom
