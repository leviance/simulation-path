// std430 mirror of GpuMeta in gpu/storage.hpp, including the moving boundary state.
layout(std430, binding = 7) buffer Control {
    uint flags;
    uint updated;
    uint leakage;
    uint invalid;
    float dt;
    float elapsed;
    float maximumSpeed;
    float maximumAcceleration;
    float minimumDensity;
    float maximumDensity;
    uint ticks;
    uint padding;
    vec4 body;
    vec4 bodyTarget;
    vec4 bodyVelocity;
};
