#pragma once

#include "atom_gl.hpp"
#include <iostream>

namespace atom {

// Check the limits actually used by this product before allocating point data.
// A successful graphics context alone is not evidence that its compute/storage
// limits support the shader interfaces or the million-point milestone.
inline void validateCapabilities(GlApi& gl) {
    GLint major{}, minor{}, profile{}, invocations{}, localX{}, groupsX{};
    GLint bindings{}, computeBlocks{}, vertexBlocks{}, timerBits{};
    GLint64 blockBytes{};
    gl.GetIntegerv(GL_MAJOR_VERSION, &major);
    gl.GetIntegerv(GL_MINOR_VERSION, &minor);
    gl.GetIntegerv(GL_CONTEXT_PROFILE_MASK, &profile);
    gl.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &invocations);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 0, &localX);
    gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0, &groupsX);
    gl.GetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, &bindings);
    gl.GetIntegerv(GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS, &computeBlocks);
    gl.GetIntegerv(GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS, &vertexBlocks);
    gl.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &blockBytes);
    gl.GetQueryiv(GL_TIME_ELAPSED, GL_QUERY_COUNTER_BITS, &timerBits);
    if (gl.GetError() != GL_NO_ERROR)
        throw std::runtime_error("Could not query the required OpenGL capabilities");
    if (major < 4 || (major == 4 && minor < 3) || (profile & GL_CONTEXT_CORE_PROFILE_BIT) == 0)
        throw std::runtime_error("Atomic Playground requires an OpenGL 4.3 Core context");
    if (invocations < 256 || localX < 256 || groupsX < 128)
        throw std::runtime_error("Compute limits do not support a 32768-point batch with 256 lanes");
    if (bindings < 6 || computeBlocks < 4 || vertexBlocks < 1)
        throw std::runtime_error("The compute/vertex SSBO interfaces are not supported");
    if (blockBytes < static_cast<GLint64>(1000003ULL * 32 + 64))
        throw std::runtime_error("A guarded million-point SSBO does not fit this driver's block limit");
    if (timerBits < 32)
        throw std::runtime_error("The finite GPU timer protocol needs at least 32 counter bits");
    const int linkedVersion = SDL_GetVersion();
    if (linkedVersion != SDL_VERSIONNUM(3, 4, 8))
        throw std::runtime_error("The runtime SDL library must match the pinned SDL 3.4.8 package");
    const auto* vendor = gl.GetString(GL_VENDOR);
    const auto* renderer = gl.GetString(GL_RENDERER);
    if (!vendor || !renderer)
        throw std::runtime_error("The graphics driver did not report its identity");

    const char* configuration = "Debug / assertions enabled";
#ifdef NDEBUG
    configuration = "Release / NDEBUG";
#endif
    std::cout << "MACHINE platform=" << SDL_GetPlatform() << " SDL=3.4.8 configuration=" << configuration;
#ifdef _MSC_VER
    std::cout << " compiler=MSVC-" << _MSC_VER;
#elif defined(__clang__)
    std::cout << " compiler=Clang-" << __clang_version__;
#elif defined(__GNUC__)
    std::cout << " compiler=GCC-" << __VERSION__;
#endif
    std::cout << " vendor=" << vendor << " renderer=" << renderer << '\n';
    std::cout << "CAPABILITIES localX=" << localX << " invocations=" << invocations
        << " groupsX=" << groupsX << " ssboBindings=" << bindings
        << " computeBlocks=" << computeBlocks << " vertexBlocks=" << vertexBlocks
        << " blockBytes=" << blockBytes << " timerBits=" << timerBits << '\n';
}

} // namespace atom
