#version 330 core
#if LAB_CHECKPOINT >= 9
// Raw R32F: each fragment writes a transmission ratio, not a display color.
out float outRatio;
uniform vec2 uSize;
uniform float uAngle, uStrength, uStep, uLowWeight;
uniform int uCount, uMidpoint, uSpectral;
uniform vec3 uMin[32], uMax[32];
uniform vec2 uMu[32];

vec3 toObject(vec3 p) {
    float c = cos(uAngle);
    float s = sin(uAngle);
    return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
}

float materialLength(vec3 origin, vec3 direction, float distance, vec3 low, vec3 high) {
    float entry = 0.0, exitT = distance;
    for (int axis = 0; axis < 3; ++axis) {
        if (abs(direction[axis]) < 1e-7) {
            if (origin[axis] < low[axis] || origin[axis] > high[axis]) return 0.0;
        } else {
            float a = (low[axis] - origin[axis]) / direction[axis];
            float b = (high[axis] - origin[axis]) / direction[axis];
            entry = max(entry, min(a, b));
            exitT = min(exitT, max(a, b));
        }
    }
    return max(0.0, exitT - entry);
}

// [snippet gpu-attenuation]
vec2 exactDepth(vec3 origin, vec3 direction, float distance) {
    vec2 tau = vec2(0);
    for (int i = 0; i < uCount; ++i) {
        float inside = materialLength(origin, direction, distance, uMin[i], uMax[i]);
        tau += uStrength * uMu[i] * inside;
    }
    return tau;
}
// [/snippet gpu-attenuation]

vec2 midpointDepth(vec3 origin, vec3 direction, float distance) {
    vec2 tau = vec2(0);
    for (int i = 0; i < 512; ++i) {
        float t = float(i) * uStep;
        if (t >= distance) break;
        float ds = min(uStep, distance - t);
        vec3 p = origin + (t + ds * 0.5) * direction;
        for (int m = 0; m < uCount; ++m) {
            if (all(greaterThanEqual(p, uMin[m])) && all(lessThanEqual(p, uMax[m])))
                tau += uStrength * uMu[m] * ds;
        }
    }
    return tau;
}

void main() {
    // ReadPixels starts at row 0. Give that row the meaning "top" just like CPU row 0.
    vec2 uv = gl_FragCoord.xy / uSize;
    vec3 source = vec3(0, 0, -6);
    vec3 end = vec3((uv.x - 0.5) * 6.0, (0.5 - uv.y) * 4.5, 6);
    vec3 delta = end - source;
    float distance = length(delta);
    vec3 origin = toObject(source), direction = toObject(delta / distance);
    vec2 tau;
    if (uMidpoint != 0) tau = midpointDepth(origin, direction, distance);
    else tau = exactDepth(origin, direction, distance);
    outRatio = exp(-tau.x);
    if (uSpectral != 0) outRatio = mix(exp(-tau.y), outRatio, uLowWeight);
}
#else
// In early lessons the CPU fills the detector; this stage is never drawn.
out float outRatio;
void main() { outRatio = 1.0; }
#endif
