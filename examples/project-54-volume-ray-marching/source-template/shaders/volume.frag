#version 330 core
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif
layout(location = 0) out vec4 result;
uniform vec2 uSize;
#if LAB_CHECKPOINT >= 2
uniform vec3 uOrigin, uForward, uRight, uUp;
#endif
#if LAB_CHECKPOINT >= 4
uniform sampler3D uDensity;
#endif
#if LAB_CHECKPOINT >= 5
uniform float uSigma;
#endif
#if LAB_CHECKPOINT >= 6
uniform float uStep;
#endif
#if LAB_CHECKPOINT >= 7
uniform int uWarm;
#endif
#if LAB_CHECKPOINT >= 8
uniform int uEarly;
#endif

#if LAB_CHECKPOINT >= 3
// Physical bounds, not voxel indices.
const vec3 boxMin = vec3(-1.6, -1.92, -2.4);
const vec3 boxMax = vec3(1.6, 1.92, 2.4);

bool intervalFor(vec3 origin, vec3 direction, out float entry, out float exit) {
    entry = 0.0;
    exit = 20.0;
    for (int axis = 0; axis < 3; ++axis) {
        if (direction[axis] == 0.0) {
            if (origin[axis] < boxMin[axis] || origin[axis] > boxMax[axis]) {
                return false;
            }
            continue;
        }
        float a = (boxMin[axis] - origin[axis]) / direction[axis];
        float b = (boxMax[axis] - origin[axis]) / direction[axis];
        entry = max(entry, min(a, b));
        exit = min(exit, max(a, b));
        if (entry >= exit) {
            return false;
        }
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 4
float densityAt(vec3 point) {
    vec3 uvw = (point - boxMin) / (boxMax - boxMin);
    return texture(uDensity, uvw).r;
}
#endif

#if LAB_CHECKPOINT >= 6
vec3 transfer(float density) {
#if LAB_CHECKPOINT >= 7
    if (uWarm != 0) {
        return vec3(0.2 + 0.8 * density, 0.45 + 0.25 * density, 1.0 - 0.8 * density);
    }
#endif
    return vec3(0.8, 0.9, 1.0);
}
#endif

void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
#if LAB_CHECKPOINT <= 1
    result = vec4(uv, 0.2, 0.0);
#endif
#if LAB_CHECKPOINT >= 2
    float tangent = tan(radians(55.0) * 0.5);
    vec3 direction = normalize(uForward + (2.0 * uv.x - 1.0) * (uSize.x / uSize.y) * tangent * uRight + (2.0 * uv.y - 1.0) * tangent * uUp);
#endif
#if LAB_CHECKPOINT == 2
    result = vec4(direction * 0.5 + 0.5, 0.0);
#endif
#if LAB_CHECKPOINT >= 3
    float entry, exit;
    if (!intervalFor(uOrigin, direction, entry, exit)) {
        result = vec4(0, 0, 0, 1);
        return;
    }
#endif
#if LAB_CHECKPOINT == 3
    result = vec4(vec3((exit - entry) / 7.0), 0.0);
#endif
#if LAB_CHECKPOINT == 4
    float density = densityAt(uOrigin + direction * (entry + exit) * 0.5);
    result = vec4(vec3(density), 0.0);
#endif
#if LAB_CHECKPOINT == 5
    // One midpoint approximates the whole segment only at checkpoint 5.
    float density = densityAt(uOrigin + direction * (entry + exit) * 0.5);
    float transmittance = exp(-uSigma * density * (exit - entry));
    result = vec4(vec3(0.8, 0.9, 1.0) * (1.0 - transmittance), transmittance);
#endif
#if LAB_CHECKPOINT >= 6
    int count = int(ceil((exit - entry) / uStep));
    if (count > 512) {
        result = vec4(1, 0, 1, -1);
        return;
    }
    vec3 color = vec3(0);
    float transmittance = 1.0;
    for (int i = 0; i < 512; ++i) {
        if (i >= count) {
            break;
        }
        float t = entry + float(i) * uStep;
        float ds = min(uStep, exit - t);
        float density = densityAt(uOrigin + direction * (t + ds * 0.5));
        float segmentT = exp(-uSigma * density * ds);
        float alpha = 1.0 - segmentT;
        // Use T before attenuating it by this segment.
        color += transmittance * alpha * transfer(density);
        transmittance *= segmentT;
#if LAB_CHECKPOINT >= 8
        if (uEarly != 0 && transmittance <= 0.001) {
            break;
        }
#endif
    }
    result = vec4(color, transmittance);
#endif
}
