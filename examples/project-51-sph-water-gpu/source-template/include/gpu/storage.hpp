#pragma once
#include "fluid/model.hpp"
#include "gpu/buffer.hpp"
#include <array>
#include <vector>

namespace water51 {
// Three banks separate the visible committed state from the finite pending batch.

// [snippet meta-layout]
struct alignas(16) GpuMeta {
    std::uint32_t flags = 0;
    std::uint32_t updated = 0;
    std::uint32_t leakage = 0;
    std::uint32_t invalid = 0;
    float dt = 0;
    float elapsed = 0;
    float maximumSpeed = 0;
    float maximumAcceleration = 0;
    float minimumDensity = 0;
    float maximumDensity = 0;
    std::uint32_t ticks = 0;
    std::uint32_t padding = 0;
    Float4 body{0.92f, 0.22f, 0.55f, 0};
    Float4 target = body;
    Float4 bodyVelocity{};
};

static_assert(sizeof(GpuMeta) == 96);
static_assert(offsetof(GpuMeta, body) == 48);

// [/snippet meta-layout]
struct Bank {
    Buffer position;
    Buffer velocity;
    Buffer field;

    Bank(Gl& gl, std::uint32_t count)
        : position(gl, count * sizeof(Float4)), velocity(gl, count * sizeof(Float4)), field(gl, count * sizeof(DensityPressure)) {}
};

struct ScanLevel {
    std::uint32_t entries;
    std::uint32_t groups;
    Buffer sums;
    Buffer prefix;

    ScanLevel(Gl& gl, std::uint32_t size)
        : entries(size), groups((size + 255) / 256), sums(gl, groups * sizeof(std::uint32_t)), prefix(gl, groups * sizeof(std::uint32_t)) {}
};

struct Storage {
    Model model;
    std::array<Bank, 3> banks;
    Buffer acceleration;
    Buffer counts;
    Buffer offsets;
    Buffer indices;
    Buffer meta;
    std::vector<ScanLevel> scan;
    std::array<Buffer, 2> reduction;

    Storage(Gl& gl, Model specification)
        : model(specification), banks{Bank(gl, model.count), Bank(gl, model.count), Bank(gl, model.count)}, acceleration(gl, model.count * sizeof(Float4)), counts(gl, model.cellCount * sizeof(std::uint32_t)), offsets(gl, (model.cellCount + 1) * sizeof(std::uint32_t)), indices(gl, model.count * sizeof(std::uint32_t)), meta(gl, sizeof(GpuMeta)), reduction{Buffer(gl, ((model.count + 127) / 128) * sizeof(Float4)), Buffer(gl, ((model.count + 127) / 128) * sizeof(Float4))} {
        std::uint32_t entries = model.cellCount;
        do {
            scan.emplace_back(gl, entries);
            entries = scan.back().groups;
        } while (entries > 1);
    }
};
} // namespace water51
