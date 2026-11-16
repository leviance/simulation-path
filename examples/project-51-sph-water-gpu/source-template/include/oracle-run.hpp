#pragma once
#include "force-verification.hpp"
#include "validation.hpp"

namespace water3 {
#if LAB_CHECKPOINT >= 12
class OracleRun {
    public:
    void start(VerifyCase fixture) {
        fixture_ = fixture;
        checked_ = 0;
        started_ = std::chrono::steady_clock::now();
    }

    bool service(lab::GlApi& gl, Engine& engine) {
        if (std::chrono::steady_clock::now() - started_ > std::chrono::seconds(15))
            throw std::runtime_error("GPU verification total timeout");
        if (!engine.ready || engine.queue.pending())
            return false;
        if (engine.steps > checked_) {
            bool valid = false;
            if (fixture_ == VerifyCase::force)
                valid = validateForceFixture(gl, engine, positions_, velocities_);
            else
                valid = validateGpu(gl, engine, positions_, velocities_);
            if (!valid)
                throw std::runtime_error("GPU differs from independent CPU oracle");
            checked_ = engine.steps;
        }
        if (checked_ == 2)
            return true;
        const auto& plan = engine.storage.plan;
        positions_ = readVector<Float4>(gl, engine.storage.positions[engine.current], plan.count);
        velocities_ = readVector<Float4>(gl, engine.storage.velocities[engine.current], plan.count);
        if (checked_ == 0) {
            for (std::uint32_t i = 0; i < plan.count; ++i) {
                const auto expected = initialPosition(plan, i);
                const auto actual = positions_[i];
                if (!closeEnough(actual.x, expected.x, 1e-6, 0) || !closeEnough(actual.y, expected.y, 1e-6, 0) || !closeEnough(actual.z, expected.z, 1e-6, 0) || actual.w != 1 || length(xyz(velocities_[i])) != 0 || velocities_[i].w != 0)
                    throw std::runtime_error("GPU initialization/layout differs from CPU lattice");
            }
            std::cout << "INIT layout/position/velocity PASS N=" << plan.count << '\n';
        }
        if (checked_ == 0 && (fixture_ == VerifyCase::acoustic || fixture_ == VerifyCase::perturbed)) {
            prepareVerifyCase(fixture_, positions_, velocities_);
            const auto expected = evaluate(plan, positions_, velocities_, engine.settings);
            const auto extrema = oracleStats(velocities_, expected);
            if (fixture_ == VerifyCase::acoustic) {
                const double acoustic = 0.25 * plan.h / (engine.settings.soundSpeed + extrema.speed);
                const double forceBound = 0.25 * std::sqrt(plan.h / std::max(extrema.acceleration, 1e-12));
                if (!(acoustic < std::min(maxDt, forceBound)))
                    throw std::runtime_error("Inactive acoustic fixture bound");
            } else {
                Settings zeroViscosity = engine.settings;
                zeroViscosity.alpha = 0;
                const auto without = evaluate(plan, positions_, velocities_, zeroViscosity);
                double delta = 0, pressureMaximum = 0;
                for (std::size_t i = 0; i < positions_.size(); ++i) {
                    delta = std::max(delta, length(subtract(expected.acceleration[i], without.acceleration[i])));
                    pressureMaximum = std::max(pressureMaximum, expected.pressure[i]);
                }
                if (pressureMaximum < 10000 || delta < 0.01)
                    throw std::runtime_error("Nonzero SPH fixture is too weak");
                std::cout << "PERTURBED pressureMax=" << pressureMaximum << " viscosityDelta=" << delta << '\n';
            }
            gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, engine.storage.positions[engine.current]);
            gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, positions_.size() * sizeof(Float4), positions_.data());
            gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, engine.storage.velocities[engine.current]);
            gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, velocities_.size() * sizeof(Float4), velocities_.data());
            gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        }
        if (fixture_ == VerifyCase::force)
            submitForceFixture(gl, engine);
        else
            engine.submit(gl);
        return false;
    }

    private:
    VerifyCase fixture_ = VerifyCase::lattice;
    std::chrono::steady_clock::time_point started_{};
    std::uint64_t checked_ = 0;
    std::vector<Float4> positions_, velocities_;
};

class ReferenceJob {
    public:
    bool active = false;
    std::string message;

    bool pending() const {
        return active && engine_.queue.pending();
    }

    void start(lab::GlApi& gl, const std::string& directory) {
        if (active)
            return;
        loaded_ = true;
        try {
            engine_.initialize(gl, directory);
            engine_.reset(gl, makePlan());
        } catch (...) {
            destroy(gl);
            throw;
        }
        run_.start(VerifyCase::perturbed);
        active = true;
        cancelled_ = false;
        message = "VERIFY 512 - PRIMARY SCENE PAUSED";
    }

    void cancel() {
        cancelled_ = true;
    }

    void service(lab::GlApi& gl) {
        if (!active)
            return;
        try {
            engine_.poll(gl);
            if (cancelled_) {
                if (!engine_.queue.pending()) {
                    message = "VERIFY CANCELLED";
                    destroy(gl);
                }
            } else if (run_.service(gl, engine_)) {
                message = "VERIFY 512 PASS - PRIMARY UNCHANGED";
                destroy(gl);
            }
        } catch (const GpuBatchError&) {
            // Let main stop the application; a failed GPU must not accept more primary work.
            throw;
        } catch (const std::exception& error) {
            message = std::string("VERIFY FAILED: ") + error.what();
            destroy(gl);
        }
    }

    void destroy(lab::GlApi& gl) {
        if (loaded_)
            engine_.destroy(gl);
        loaded_ = false;
        active = false;
    }

    private:
    Engine engine_;
    OracleRun run_;
    bool loaded_ = false, cancelled_ = false;
};
#endif
} // namespace water3
