#pragma once

#include "sculpt_gpu_mesh.hpp"

namespace sculpt {

// Match the compute shader's 64-byte result layout; the request tag lets input
// discard a late answer instead of starting a stroke on an obsolete field.
struct PickData {
    std::array<float, 4> pointValue{}, normalHit{}, gridCoordinate{};
    std::array<std::uint32_t, 4> state{};
};

static_assert(sizeof(PickData) == 64);

struct PickAnswer {
    PickData data;
    std::uint64_t tag{};

    bool hit() const {
        return data.state[0] == 1;
    }

    Vec3 point() const {
        return {data.pointValue[0], data.pointValue[1], data.pointValue[2]};
    }

    Vec3 normal() const {
        return {data.normalHit[0], data.normalHit[1], data.normalHit[2]};
    }
};

class GpuPicker {
    public:
    GpuPicker(GlApi& gl, GpuBudget& budget)
        : gl_(gl), program_(gl, "sculpt_pick.comp"), ticket_(gl), result_(gl, budget, sizeof(PickData) + guardBytes) {
        result_.setGuard(sizeof(PickData));
    }

    bool busy() const {
        return ticket_.busy();
    }

    bool request(const GpuMeshBuilder& model, Vec3 origin, Vec3 direction, std::uint64_t tag) {
        if (busy() || !model.ready())
            return false;
        if (!finite(origin) || length(origin) > 32)
            throw std::invalid_argument("Picking origin must stay in the bounded camera domain");
        direction = normalized(direction);
        const auto& grid = model.settings().grid;
        program_.use();
        gl_.Uniform1i(program_.uniform("gridN"), grid.samples);
        gl_.Uniform1f(program_.uniform("gridSpacing"), grid.spacing());
        gl_.Uniform3f(program_.uniform("gridOrigin"), grid.origin.x, grid.origin.y, grid.origin.z);
        gl_.Uniform1f(program_.uniform("isovalue"), model.settings().isovalue);
        gl_.Uniform3f(program_.uniform("rayOrigin"), origin.x, origin.y, origin.z);
        gl_.Uniform3f(program_.uniform("rayDirection"), direction.x, direction.y, direction.z);
        gl_.Uniform1ui(program_.uniform("fieldRevision"), model.document().revision());
        model.document().field().bind(0);
        result_.bind(7);
        tag_ = tag;
        ticket_.begin(0);
        gl_.DispatchCompute(1, 1, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        ticket_.end();
        ticket_.submit();
        return true;
    }

    std::optional<PickAnswer> poll() {
        if (!busy() || !ticket_.poll())
            return {};
        PickAnswer result;
        result.tag = tag_;
        result_.read(0, std::as_writable_bytes(std::span(&result.data, 1)));
        if (!result_.guardIntact(sizeof(PickData)) || result.data.state[3] != 0 || result.data.state[0] > 1)
            throw std::runtime_error("Picking exceeded its finite step/output budget");
        if (result.hit() && (!finite(result.point()) || !finite(result.normal()) || !std::isfinite(result.data.pointValue[3])))
            throw std::runtime_error("Picking returned a non-finite field probe");
        return result;
    }

    private:
    GlApi& gl_;
    Program program_;
    GpuTicket ticket_;
    GpuBuffer result_;
    std::uint64_t tag_{};
};

} // namespace sculpt
