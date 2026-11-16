#version 430 core
in vec3 world;
uniform int uGeometry;
out vec4 fragment;

float gridLine(float scale) {
    vec2 p = world.xz * scale;
    vec2 edge = abs(fract(p - 0.5) - 0.5) / max(fwidth(p), vec2(0.0001));
    return 1.0 - clamp(min(edge.x, edge.y), 0.0, 1.0);
}

void main() {
    vec3 color = vec3(0.025, 0.045, 0.065);
    color += vec3(0.025, 0.05, 0.065) * gridLine(20.0);
    color += vec3(0.035, 0.065, 0.09) * gridLine(4.0);
    if (uGeometry == 1)
        color = vec3(0.19, 0.32, 0.40);
    fragment = vec4(color, 1.0);
}
