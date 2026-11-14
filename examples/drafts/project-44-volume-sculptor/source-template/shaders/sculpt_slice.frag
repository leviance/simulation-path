#version 430 core
layout(std430, binding = 0) readonly buffer ScalarField { float field[]; };
uniform int gridN;
uniform int sliceAxis;
uniform int sliceLayer;
uniform float isovalue;
uniform vec2 probeUV;
in vec2 uv;
out vec4 pixel;

float at(ivec3 c) {
    return field[(c.z * gridN + c.y) * gridN + c.x];
}

float sampleGrid(vec3 coordinate) {
    coordinate = clamp(coordinate, vec3(0), vec3(gridN - 1));
    ivec3 c = min(ivec3(floor(coordinate)), ivec3(gridN - 2));
    vec3 t = coordinate - vec3(c);
    float y0 = mix(at(c), at(c + ivec3(1,0,0)), t.x);
    float y1 = mix(at(c + ivec3(0,1,0)), at(c + ivec3(1,1,0)), t.x);
    float nextY0 = mix(at(c + ivec3(0,0,1)), at(c + ivec3(1,0,1)), t.x);
    float nextY1 = mix(at(c + ivec3(0,1,1)), at(c + ivec3(1,1,1)), t.x);
    return mix(mix(y0, y1, t.y), mix(nextY0, nextY1, t.y), t.z);
}

// snippet:sculpt-slice-fragment
void main() {
    vec3 coordinate = vec3(0);
    coordinate[sliceAxis] = float(sliceLayer);
    coordinate[(sliceAxis + 1) % 3] = uv.x * float(gridN - 1);
    coordinate[(sliceAxis + 2) % 3] = uv.y * float(gridN - 1);
    float value = sampleGrid(coordinate) - isovalue;
    // Color encodes scalar sign/magnitude, not geometric distance after editing.
    vec3 color = vec3(0.07, 0.20, 0.38);
    if (value >= 0.0)
        color = vec3(0.35, 0.18, 0.075);
    color *= 0.55 + 0.45 * (1.0 - exp(-abs(value) * 3.0));
    float contour = 1.0 - smoothstep(0.0, max(fwidth(value) * 1.5, 1e-5), abs(value));
    color = mix(color, vec3(0.65, 1.0, 0.87), contour);
    vec2 selected = vec2(probeUV.x, 1.0 - probeUV.y);
    vec2 distance = abs(uv - selected);
    if (distance.x < fwidth(uv.x) * 0.75 || distance.y < fwidth(uv.y) * 0.75)
        color = mix(color, vec3(0.9, 0.8, 0.42), 0.8);
    pixel = vec4(color, 1);
}
// end-snippet:sculpt-slice-fragment
