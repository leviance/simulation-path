#pragma once

#include "gpu_program.hpp"
#include "gpu_storage.hpp"

#include <array>

namespace molecular {

// Mỗi pass có program và bindings riêng, không phụ thuộc state GL còn sót lại.
enum class Pass : std::size_t {
    Initialize,
    Clear,
    Build,
    Force,
    Drift,
    Kick,
    Diagnostics,
    Idle
};

inline const char* passName(Pass pass) {
    constexpr std::array names{"initialize", "clear cells", "build cells", "force", "drift", "kick", "reduce diagnostics", "idle"};
    return names.at(static_cast<std::size_t>(pass));
}

struct Kernel {
    GLuint program = 0;
    GLint count = -1;
    GLint base = -1;
    GLint columns = -1;
    GLint cellsX = -1;
    GLint cellsY = -1;
    GLint box = -1;
    GLint grid = -1;
    GLint dt = -1;
    GLint reduce = -1;
};

class Kernels {
    public:
    void load(lab::GlApi& gl, const std::string& directory) {
        constexpr std::array files{"initialize.comp", "clear.comp", "build.comp", "force.comp", "drift.comp", "kick.comp", "diagnostics.comp"};
        for (std::size_t i = 0; i < kernels_.size(); ++i) {
            auto& kernel = kernels_[i];
            kernel.program = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, files[i]}});
            kernel.count = requireUniform(gl, kernel.program, "uCount");
            kernel.base = requireUniform(gl, kernel.program, "uBase");
            const auto pass = static_cast<Pass>(i);
            if (pass == Pass::Initialize) {
                kernel.columns = requireUniform(gl, kernel.program, "uColumns");
            }
            if (pass == Pass::Build || pass == Pass::Force) {
                kernel.cellsX = requireUniform(gl, kernel.program, "uCellsX");
                kernel.cellsY = requireUniform(gl, kernel.program, "uCellsY");
            }
            if (pass == Pass::Build || pass == Pass::Force || pass == Pass::Drift) {
                kernel.box = requireUniform(gl, kernel.program, "uBox");
            }
            if (pass == Pass::Force) {
                kernel.grid = requireUniform(gl, kernel.program, "uGrid");
            }
            if (pass == Pass::Drift || pass == Pass::Kick) {
                kernel.dt = requireUniform(gl, kernel.program, "uDt");
            }
            if (pass == Pass::Diagnostics) {
                kernel.reduce = requireUniform(gl, kernel.program, "uReduce");
            }
        }
    }

    void prepare(lab::GlApi& gl, Pass pass, const Storage& storage, int current, int target, std::uint32_t base, bool useGrid, std::uint32_t reductionCount, int reductionInput, int reductionOutput, bool reducing) {
        const auto& kernel = kernels_.at(static_cast<std::size_t>(pass));
        const auto& plan = storage.plan;
        const auto& source = storage.banks.at(current);
        const auto& destination = storage.banks.at(target);
        gl.UseProgram(kernel.program);
        gl.Uniform1ui(kernel.base, base);
        gl.Uniform1ui(kernel.count, plan.count);
        if (kernel.box >= 0) {
            gl.Uniform2f(kernel.box, plan.width, plan.height);
        }
        if (kernel.cellsX >= 0) {
            gl.Uniform1ui(kernel.cellsX, plan.cellsX);
            gl.Uniform1ui(kernel.cellsY, plan.cellsY);
        }
        if (kernel.dt >= 0) {
            gl.Uniform1f(kernel.dt, timeStep);
        }
        switch (pass) {
        case Pass::Initialize:
            bind(gl, 0, destination.positions);
            bind(gl, 1, destination.velocities);
            bind(gl, 2, destination.forces);
            gl.Uniform1ui(kernel.columns, plan.columns);
            break;
        case Pass::Clear:
            bind(gl, 0, storage.counts);
            gl.Uniform1ui(kernel.count, plan.cells);
            break;
        case Pass::Build:
            bind(gl, 0, destination.positions);
            bind(gl, 1, storage.referencePositions);
            bind(gl, 2, storage.counts);
            bind(gl, 3, storage.indices);
            bind(gl, 4, storage.control);
            break;
        case Pass::Force:
            bind(gl, 0, destination.positions);
            bind(gl, 1, destination.forces);
            bind(gl, 2, storage.referencePositions);
            bind(gl, 3, storage.counts);
            bind(gl, 4, storage.indices);
            bind(gl, 5, storage.control);
            gl.Uniform1i(kernel.grid, static_cast<int>(useGrid));
            break;
        case Pass::Drift:
            bind(gl, 0, source.positions);
            bind(gl, 1, source.velocities);
            bind(gl, 2, source.forces);
            bind(gl, 3, destination.positions);
            bind(gl, 4, destination.velocities);
            bind(gl, 5, storage.control);
            break;
        case Pass::Kick:
            bind(gl, 0, destination.velocities);
            bind(gl, 1, destination.forces);
            bind(gl, 2, storage.control);
            break;
        case Pass::Diagnostics:
            bind(gl, 0, destination.velocities);
            bind(gl, 1, destination.forces);
            bind(gl, 2, storage.scratch.at(reductionInput));
            bind(gl, 3, storage.scratch.at(reductionOutput));
            gl.Uniform1ui(kernel.count, reductionCount);
            gl.Uniform1i(kernel.reduce, static_cast<int>(reducing));
            break;
        case Pass::Idle:
            break;
        }
    }

    void destroy(lab::GlApi& gl) {
        for (auto& kernel : kernels_) {
            gl.DeleteProgram(kernel.program);
            kernel = {};
        }
    }

    private:
    std::array<Kernel, 7> kernels_{};
};

} // namespace molecular
