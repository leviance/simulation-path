#pragma once
#include "gpu/program.hpp"
#include "gpu/storage.hpp"

namespace water51 {
// Each dispatch writes one stage; a storage barrier exposes it to the next consumer.

class Passes {
    Gl& gl_;
    Program initialize_, prepare_, clear_, count_, scan_, add_, cursors_, scatter_, density_, force_, reduce_, integrate_, finish_;

    static Program compute(Gl& gl, const std::filesystem::path& root, const char* file) {
        return Program(gl, root, {{GL_COMPUTE_SHADER, file}});
    }

    // [snippet dispatch]
    void dispatch(std::uint32_t entries, std::uint32_t local = 128) {
        gl_.DispatchCompute((entries + local - 1) / local, 1, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
    }

    // [/snippet dispatch]

    // [snippet physics-bindings]
    void physics(const Program& program, Storage& s, int source, const Parameters& p, bool grid) {
        program.use();
        program.setUnsigned("particleCount", s.model.count);
        program.setUnsigned("cellCount", s.model.cellCount);
        program.setInt("latticeSide", s.model.side);
        program.setIntegers("gridSize", s.model.cells[0], s.model.cells[1], s.model.cells[2]);
        program.setFloat("spacing", s.model.spacing);
        program.setFloat("smoothingLength", s.model.h);
        program.setFloat("particleMass", s.model.mass);
        program.setFloat("soundSpeed", p.soundSpeed);
        program.setFloat("viscosityAlpha", p.alpha);
        program.setFloat("gravity", p.gravity);
        program.setInt("useGrid", static_cast<int>(grid));
        s.banks[source].position.bind(0);
        s.banks[source].velocity.bind(1);
        s.banks[source].field.bind(2);
        s.acceleration.bind(3);
        s.counts.bind(4);
        s.offsets.bind(5);
        s.indices.bind(6);
        s.meta.bind(7);
    }

    // [/snippet physics-bindings]

    public:
    Passes(Gl& gl, const std::filesystem::path& root)
        : gl_(gl), initialize_(compute(gl, root, "sph/initialize.comp")), prepare_(compute(gl, root, "sph/prepare.comp")), clear_(compute(gl, root, "sph/clear.comp")), count_(compute(gl, root, "sph/count.comp")), scan_(compute(gl, root, "sph/scan.comp")), add_(compute(gl, root, "sph/add-offsets.comp")), cursors_(compute(gl, root, "sph/cursors.comp")), scatter_(compute(gl, root, "sph/scatter.comp")), density_(compute(gl, root, "sph/density.comp")), force_(compute(gl, root, "sph/force.comp")), reduce_(compute(gl, root, "sph/reduce.comp")), integrate_(compute(gl, root, "sph/integrate.comp")), finish_(compute(gl, root, "sph/finish.comp")) {}

    // [snippet initialize-pass]
    void initialize(Storage& s, int targetBank = 0) {
#if LAB_CHECKPOINT >= 3

        initialize_.use();
        initialize_.setUnsigned("particleCount", s.model.count);
        initialize_.setInt("latticeSide", s.model.side);
        initialize_.setInt("preset", static_cast<int>(s.model.preset));
        initialize_.setFloat("spacing", s.model.spacing);
        s.banks[targetBank].position.bind(0);
        s.banks[targetBank].velocity.bind(1);
        s.banks[targetBank].field.bind(2);
        dispatch(s.model.count);

#else
        // This pass is introduced in a later checkpoint.
        (void)s;
        (void)targetBank;
#endif
    }

    // [/snippet initialize-pass]

    void prepare(Storage& s) {
        s.meta.bind(7);
        prepare_.use();
        dispatch(1);
    }

    // [snippet scan-hierarchy]
    void grid(Storage& s, int source, const Parameters& p) {
#if LAB_CHECKPOINT >= 6

        physics(clear_, s, source, p, true);
        dispatch(s.model.cellCount);
        physics(count_, s, source, p, true);
        dispatch(s.model.count);
        for (std::size_t level = 0; level < s.scan.size(); ++level) {
            auto& pass = s.scan[level];
            if (level == 0) {
                s.counts.bind(0);
                s.offsets.bind(1);
            } else {
                s.scan[level - 1].sums.bind(0);
                s.scan[level - 1].prefix.bind(1);
            }
            pass.sums.bind(2);
            scan_.use();
            scan_.setUnsigned("entries", pass.entries);
            dispatch(pass.entries, 256);
        }
        for (std::size_t index = s.scan.size(); index > 1; --index) {
            const auto level = index - 2;
            if (level == 0)
                s.offsets.bind(0);
            else
                s.scan[level - 1].prefix.bind(0);
            s.scan[level].prefix.bind(1);
            add_.use();
            add_.setUnsigned("entries", s.scan[level].entries);
            dispatch(s.scan[level].entries);
        }
        s.offsets.bind(0);
        s.counts.bind(1);
        cursors_.use();
        cursors_.setUnsigned("cellCount", s.model.cellCount);
        cursors_.setUnsigned("particleCount", s.model.count);
        dispatch(s.model.cellCount + 1);
        physics(scatter_, s, source, p, true);
        dispatch(s.model.count);

#else
        // This pass is introduced in a later checkpoint.
        (void)s;
        (void)source;
        (void)p;
#endif
    }

    // [/snippet scan-hierarchy]
    // [snippet density-pass]
    void density(Storage& s, int source, const Parameters& p, bool gridEnabled) {
#if LAB_CHECKPOINT >= 4

        physics(density_, s, source, p, gridEnabled);
        dispatch(s.model.count);

#else
        // This pass is introduced in a later checkpoint.
        (void)s;
        (void)source;
        (void)p;
        (void)gridEnabled;
#endif
    }

    // [/snippet density-pass]

    // [snippet force-pass]
    void force(Storage& s, int source, const Parameters& p, bool gridEnabled) {
#if LAB_CHECKPOINT >= 5

        physics(force_, s, source, p, gridEnabled);
        dispatch(s.model.count);

#else
        // This pass is introduced in a later checkpoint.
        (void)s;
        (void)source;
        (void)p;
        (void)gridEnabled;
#endif
    }

    // [/snippet force-pass]

    // [snippet extrema-hierarchy]
    void extrema(Storage& s, int source, const Parameters& p) {
#if LAB_CHECKPOINT >= 5

        s.banks[source].velocity.bind(0);
        s.acceleration.bind(1);
        s.banks[source].field.bind(2);
        s.meta.bind(7);
        std::uint32_t entries = s.model.count;
        int output = 0;
        bool first = true;
        do {
            s.reduction[1 - output].bind(3);
            s.reduction[output].bind(4);
            reduce_.use();
            reduce_.setUnsigned("entries", entries);
            reduce_.setInt("firstLevel", static_cast<int>(first));
            reduce_.setInt("lastLevel", static_cast<int>(entries <= 128));
            reduce_.setFloat("h", s.model.h);
            reduce_.setFloat("c", p.soundSpeed);
            dispatch(entries);
            entries = (entries + 127) / 128;
            output = 1 - output;
            first = false;
        } while (entries > 1);

#else
        // This pass is introduced in a later checkpoint.
        (void)s;
        (void)source;
        (void)p;
#endif
    }

    // [/snippet extrema-hierarchy]
    // [snippet integrate-pass]
    void integrate(Storage& s, int source, int target) {
#if LAB_CHECKPOINT >= 5

        s.banks[source].position.bind(0);
        s.banks[source].velocity.bind(1);
        s.acceleration.bind(2);
        s.banks[target].position.bind(3);
        s.banks[target].velocity.bind(4);
        s.banks[source].field.bind(5);
        s.banks[target].field.bind(6);
        s.meta.bind(7);
        integrate_.use();
        integrate_.setUnsigned("particleCount", s.model.count);
        integrate_.setFloat("spacing", s.model.spacing);
        dispatch(s.model.count);
        finish_.use();
        finish_.setUnsigned("particleCount", s.model.count);
        dispatch(1, 1);

#else
        // This pass is introduced in a later checkpoint.
        (void)s;
        (void)source;
        (void)target;
#endif
    }

    // [/snippet integrate-pass]
};
} // namespace water51
