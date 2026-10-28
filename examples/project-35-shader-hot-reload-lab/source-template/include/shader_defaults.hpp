#pragma once
#include "pipeline.hpp"

namespace lab {
// Starter and recovery only. The finished gallery reads four external fragments.
inline constexpr const char* kEmbeddedVertexShader = R"glsl(#version 330 core
void main() {
    vec2 positions[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
    gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}
)glsl";

inline constexpr const char* kEmbeddedFragmentShader = R"glsl(#version 330 core
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uZoom;
out vec4 fragColor;
void main() {
    vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
    vec2 mouse = uMouse / max(uResolution, vec2(1.0));
    vec3 color = mix(vec3(0.06, 0.12, 0.30), vec3(0.15, 0.82, 0.77), uv.y);
    color += 0.05 * cos(uTime + uv.x * 6.0 * uZoom);
    color += 0.1 * exp(-18.0 * dot(uv - mouse, uv - mouse));
    fragColor = vec4(color, 1.0);
}
)glsl";

inline ShaderSources embeddedShaderSources() {
    return {kEmbeddedVertexShader, kEmbeddedFragmentShader, "embedded.vert", "embedded.frag"};
}
} // namespace lab
