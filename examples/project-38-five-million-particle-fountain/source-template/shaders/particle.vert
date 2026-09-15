#version 430 core

#if LAB_CHECKPOINT >= 5
struct Particle {
    vec4 positionAge;
    vec4 velocityLife;
};

layout(std430, binding = 0) readonly buffer ParticleBuffer {
    Particle particles[];
};

uniform int uParticleCount;
uniform vec2 uHalfExtent;
uniform float uPointScale;

out float vAge01;
out float vSpeed01;

void main() {
    uint index = uint(gl_VertexID);
    if (index >= uint(uParticleCount)) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        vAge01 = 1.0;
        vSpeed01 = 0.0;
        return;
    }

    Particle particle = particles[index];
    vec2 safeHalfExtent = max(uHalfExtent, vec2(0.001));
    vec2 clipPosition = particle.positionAge.xy / safeHalfExtent;
    gl_Position = vec4(clipPosition, 0.0, 1.0);

    float lifetime = max(particle.velocityLife.w, 0.001);
    vAge01 = clamp(particle.positionAge.w / lifetime, 0.0, 1.0);
    vSpeed01 = clamp(length(particle.velocityLife.xy) / 12.0, 0.0, 1.0);
    gl_PointSize = mix(2.6, 1.1, vAge01) * uPointScale;
}
#endif
