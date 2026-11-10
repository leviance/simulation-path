#pragma once

#include "parametric_mesh.hpp"

#include <optional>
#include <string>

namespace geometry {

enum class MeshPass { preview, final };

#if LAB_CHECKPOINT >= 7
inline SurfaceSettings previewSettings(SurfaceSettings settings) {
    int uLimit = 32;
    if (usesSweep(settings.kind))
        uLimit = minSweepSegments;
    settings.uSegments = std::min(settings.uSegments, uLimit);
    settings.vSegments = std::min(settings.vSegments, 16);
    return settings;
}
#endif

class MeshSession {
    public:
    bool request(const SurfaceSettings& settings, bool interactive = false) {
#if LAB_CHECKPOINT < 7
        (void)interactive;
#endif
        try {
            validateSettings(settings);
        } catch (const std::exception& error) {
            reject(error.what());
            return false;
        }
        if (requested_ && *requested_ == settings) {
#if LAB_CHECKPOINT >= 7
            interactive_ = interactive;
#endif
            return true;
        }

        // Keep only the latest input. No old candidate may finish after a new request.
        discardWork();
        message_.clear();
        if (lastGood_ && lastGood_->settings == settings)
            return true;
        requested_ = settings;
#if LAB_CHECKPOINT >= 7
        interactive_ = interactive;
        pass_ = MeshPass::final;
        if (interactive_ || previewSettings(settings) != settings)
            pass_ = MeshPass::preview;
#endif
        return true;
    }

    void finishInteraction() {
#if LAB_CHECKPOINT >= 7
        interactive_ = false;
#endif
    }

    void advance() {
        if (!requested_ || ready_ || waitingForRelease())
            return;
        try {
            if (!candidate_) {
                SurfaceSettings settings = *requested_;
#if LAB_CHECKPOINT >= 7
                if (pass_ == MeshPass::preview)
                    settings = previewSettings(settings);
#endif
                candidate_.emplace(settings);
                ++buildCount_;
            }
#if LAB_CHECKPOINT >= 7
            if (pass_ == MeshPass::preview) {
                // At most 65 x 17 samples: finish this small preview before the next draw.
                constexpr int previewBatches = (minSweepSegments + maxRowsPerBatch) / maxRowsPerBatch;
                for (int batch = 0; batch < previewBatches && candidate_->state() == BuildState::building; ++batch) {
                    candidate_->advance();
                }
            } else {
                candidate_->advance();
            }
#else
            // Early lessons cap the grid at 64 x 64 and finish it in one update.
            constexpr int smallBatches = (maxSegments + maxRowsPerBatch) / maxRowsPerBatch;
            for (int batch = 0; batch < smallBatches && candidate_->state() == BuildState::building; ++batch) {
                candidate_->advance();
            }
#endif
            if (candidate_->state() == BuildState::ready) {
                ready_ = candidate_->takeMesh();
                candidate_.reset();
            }
        } catch (const std::exception& error) {
            reject(error.what());
        }
    }

    const Mesh* readyMesh() const {
        if (ready_)
            return &*ready_;
        return nullptr;
    }

    MeshPass readyPass() const {
#if LAB_CHECKPOINT >= 7
        return pass_;
#else
        return MeshPass::final;
#endif
    }

    // The viewer calls this only after the matching GPU buffers have been uploaded.
    bool acceptReady() {
        if (!ready_)
            return false;
#if LAB_CHECKPOINT >= 7
        if (pass_ == MeshPass::preview) {
            preview_ = std::move(*ready_);
            ready_.reset();
            pass_ = MeshPass::final;
        } else
#endif
        {
            lastGood_ = std::move(*ready_);
            discardWork();
            ++publicationCount_;
        }
        return true;
    }

    void reject(std::string reason) {
        discardWork();
        message_ = std::move(reason);
    }

    void cancel() {
        discardWork();
        message_ = "Cancelled; kept the last complete mesh";
    }

    const Mesh* lastGood() const {
        if (lastGood_)
            return &*lastGood_;
        return nullptr;
    }

    const Mesh* displayedMesh() const {
#if LAB_CHECKPOINT >= 7
        if (preview_)
            return &*preview_;
#endif
        return lastGood();
    }

    bool showingPreview() const {
#if LAB_CHECKPOINT >= 7
        return preview_.has_value();
#else
        return false;
#endif
    }

    bool waitingForRelease() const {
#if LAB_CHECKPOINT >= 7
        return requested_ && interactive_ && pass_ == MeshPass::final;
#else
        return false;
#endif
    }

    const std::optional<SurfaceSettings>& requested() const {
        return requested_;
    }

    int completedRows() const {
        if (ready_)
            return ready_->settings.uSegments + 1;
        if (candidate_)
            return candidate_->completedRows();
        return 0;
    }

    int totalRows() const {
        if (!requested_)
            return 0;
#if LAB_CHECKPOINT >= 7
        if (pass_ == MeshPass::preview)
            return previewSettings(*requested_).uSegments + 1;
#endif
        return requested_->uSegments + 1;
    }

    std::size_t buildCount() const {
        return buildCount_;
    }

    std::size_t publicationCount() const {
        return publicationCount_;
    }

    const std::string& message() const {
        return message_;
    }

    private:
    void discardWork() {
        candidate_.reset();
        ready_.reset();
        requested_.reset();
#if LAB_CHECKPOINT >= 7
        preview_.reset();
        pass_ = MeshPass::final;
        interactive_ = false;
#endif
    }

    std::optional<SurfaceSettings> requested_;
    std::optional<MeshBuild> candidate_;
    std::optional<Mesh> ready_;
    std::optional<Mesh> lastGood_;
#if LAB_CHECKPOINT >= 7
    std::optional<Mesh> preview_;
    MeshPass pass_{MeshPass::final};
    bool interactive_{};
#endif
    std::string message_;
    std::size_t buildCount_{};
    std::size_t publicationCount_{};
};

} // namespace geometry
