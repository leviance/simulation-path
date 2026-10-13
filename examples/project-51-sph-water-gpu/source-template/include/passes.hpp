#pragma once
#include "storage.hpp"

namespace water3 {
// Common uniforms may be optimized out. uCount is mandatory in every compute pass here.
inline void use(lab::GlApi& gl, GLuint program, const Plan& plan, const Settings& settings, bool grid) {
    gl.UseProgram(program);
    gl.Uniform1ui(requireUniform(gl, program, "uCount"), plan.count);
    const auto uintValue = [&](const char* name, std::uint32_t value) {
        const auto location = gl.GetUniformLocation(program, name);
        if (location >= 0) {
            gl.Uniform1ui(location, value);
        }
    };
    const auto floatValue = [&](const char* name, double value) {
        const auto location = gl.GetUniformLocation(program, name);
        if (location >= 0) {
            gl.Uniform1f(location, static_cast<float>(value));
        }
    };
    uintValue("uSide", plan.side);
    uintValue("uCellsAxis", plan.cellsAxis);
    floatValue("uSpacing", plan.spacing);
    floatValue("uH", plan.h);
    floatValue("uMass", plan.mass);
    floatValue("uC", settings.soundSpeed);
    floatValue("uAlpha", settings.alpha);
    floatValue("uGravity", settings.gravity);
    const auto location = gl.GetUniformLocation(program, "uGrid");
    if (location >= 0) {
        gl.Uniform1i(location, static_cast<int>(grid));
    }
}

inline void dispatch(lab::GlApi& gl, std::uint32_t count) {
    gl.DispatchCompute(ceilDivide(count, 256), 1, 1);
    gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
}

struct Programs {
    GLuint initialize = 0, density = 0, force = 0, integrate = 0, clear = 0, count = 0, scan = 0, add = 0, cursors = 0, scatter = 0, stats = 0, maximum = 0;

    void load(lab::GlApi& gl, const std::string& directory) {
        initialize = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, "initialize.comp"}});
#if LAB_CHECKPOINT >= 5
        density = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, "density.comp"}});
#endif
#if LAB_CHECKPOINT >= 6
        force = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, "force.comp"}});
#endif
#if LAB_CHECKPOINT >= 7
        integrate = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, "integrate.comp"}});
#endif
#if LAB_CHECKPOINT >= 8
        clear = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, "clear.comp"}});
        count = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, "count.comp"}});
        scan = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, "scan.comp"}});
        add = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, "add.comp"}});
        cursors = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, "cursors.comp"}});
        scatter = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, "scatter.comp"}});
#endif
#if LAB_CHECKPOINT >= 9
        stats = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, "stats.comp"}});
        maximum = loadProgram(gl, directory, {{GL_COMPUTE_SHADER, "max.comp"}});
#endif
    }

    void destroy(lab::GlApi& gl) {
        for (const auto program : {initialize, density, force, integrate, clear, count, scan, add, cursors, scatter, stats, maximum}) {
            gl.DeleteProgram(program);
        }
        *this = Programs{};
    }
};
#if LAB_CHECKPOINT >= 8
inline void buildGrid(lab::GlApi& gl, const Programs& programs, Storage& storage, int current) {
    const auto& plan = storage.plan;
    Settings settings;
    use(gl, programs.clear, plan, settings, true);
    gl.Uniform1ui(requireUniform(gl, programs.clear, "uCount"), plan.cells);
    bind(gl, 0, storage.counts);
    dispatch(gl, plan.cells);
    use(gl, programs.count, plan, settings, true);
    bind(gl, 0, storage.positions[current]);
    bind(gl, 1, storage.counts);
    dispatch(gl, plan.count);
    GLuint source = storage.counts;
    for (const auto& level : storage.scan) {
        gl.UseProgram(programs.scan);
        gl.Uniform1i(requireUniform(gl, programs.scan, "uElementCount"), static_cast<GLint>(level.level.input));
        bind(gl, 0, source);
        bind(gl, 1, level.output);
        bind(gl, 2, level.sums);
        gl.DispatchCompute(level.level.groups, 1, 1);
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        source = level.sums;
    }
    for (std::size_t i = storage.scan.size() - 1; i > 0; --i) {
        const auto& level = storage.scan[i - 1];
        gl.UseProgram(programs.add);
        gl.Uniform1i(requireUniform(gl, programs.add, "uElementCount"), static_cast<GLint>(level.level.input));
        bind(gl, 0, level.output);
        bind(gl, 1, storage.scan[i].output);
        dispatch(gl, level.level.input);
    }
    use(gl, programs.cursors, plan, settings, true);
    gl.Uniform1ui(requireUniform(gl, programs.cursors, "uCount"), plan.cells);
    bind(gl, 0, storage.offsets);
    bind(gl, 1, storage.cursors);
    dispatch(gl, plan.cells);
    use(gl, programs.scatter, plan, settings, true);
    bind(gl, 0, storage.positions[current]);
    bind(gl, 1, storage.cursors);
    bind(gl, 2, storage.indices);
    dispatch(gl, plan.count);
}
#endif
#if LAB_CHECKPOINT >= 9
inline GLuint reduceStats(lab::GlApi& gl, const Programs& programs, const Storage& storage, int current, const Settings& settings) {
    use(gl, programs.stats, storage.plan, settings, true);
    bind(gl, 0, storage.velocities[current]);
    bind(gl, 1, storage.density);
    bind(gl, 2, storage.acceleration);
    bind(gl, 3, storage.scratch[0]);
    dispatch(gl, storage.plan.count);
    auto count = ceilDivide(storage.plan.count, 256);
    int source = 0;
    while (count > 1) {
        gl.UseProgram(programs.maximum);
        gl.Uniform1ui(requireUniform(gl, programs.maximum, "uCount"), count);
        bind(gl, 0, storage.scratch[source]);
        bind(gl, 1, storage.scratch[1 - source]);
        dispatch(gl, count);
        count = ceilDivide(count, 256);
        source = 1 - source;
    }
    return storage.scratch[source];
}
#endif
} // namespace water3
