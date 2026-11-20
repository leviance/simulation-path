#version 330 core
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
#endif
layout(location = 0) out vec4 result;
uniform vec2 uSize;
#if LAB_CHECKPOINT >= 2
uniform vec3 uOrigin;
uniform vec3 uForward;
uniform vec3 uRight;
uniform vec3 uUp;
#endif
#if LAB_CHECKPOINT >= 4
uniform sampler3D uDensity;
#endif
#if LAB_CHECKPOINT >= 5
uniform float uStep;
uniform int uMode;
#endif
#if LAB_CHECKPOINT >= 6
uniform float uSigma;
#endif
#if LAB_CHECKPOINT >= 7
uniform int uPalette;
uniform float uCutoff;
uniform int uLighting;
uniform float uSpacing;
#endif
#if LAB_CHECKPOINT >= 9
uniform int uEarly;
#endif

#if LAB_CHECKPOINT >= 3
// [snippet shader-interval]
bool intervalFor(vec3 origin, vec3 direction, out float entry, out float exit) {
    entry = 0.0;
    exit = 1e30;
    for (int axis = 0; axis < 3; ++axis) {
        if (direction[axis] == 0.0) {
            if (origin[axis] < -1.0 || origin[axis] > 1.0) return false;
            continue;
        }
        float first = (-1.0 - origin[axis]) / direction[axis];
        float last = (1.0 - origin[axis]) / direction[axis];
        entry = max(entry, min(first, last));
        exit = min(exit, max(first, last));
        if (entry >= exit) return false;
    }
    return true;
}
// [/snippet shader-interval]
#endif

#if LAB_CHECKPOINT >= 4
// [snippet texture-sample]
float densityAt(vec3 point) {
    vec3 uvw = (point + vec3(1.0)) * 0.5;
    return texture(uDensity, uvw).r;
}
// [/snippet texture-sample]
#endif

#if LAB_CHECKPOINT >= 5
float classify(float density) {
#if LAB_CHECKPOINT >= 7
    return clamp((density - uCutoff) / (1.0 - uCutoff), 0.0, 1.0);
#else
    return density;
#endif
}
#endif

#if LAB_CHECKPOINT >= 6
vec3 transferColor(float density) {
#if LAB_CHECKPOINT >= 7
    const vec3 warm[5] = vec3[5](vec3(0.42, 0.55, 0.70), vec3(0.68, 0.78, 0.88), vec3(0.88, 0.91, 0.95), vec3(0.98, 0.97, 0.93), vec3(1.0, 0.98, 0.90));
    const vec3 cool[5] = vec3[5](vec3(0.07, 0.16, 0.24), vec3(0.08, 0.49, 0.57), vec3(0.35, 0.78, 0.74), vec3(1.0, 0.55, 0.22), vec3(1.0, 0.92, 0.72));
    if (uPalette == 2) return vec3(1.0);
    float position = clamp(density, 0.0, 1.0) * 4.0;
    int first = min(3, int(position));
    float fraction = position - float(first);
    if (uPalette == 1) return mix(cool[first], cool[first + 1], fraction);
    return mix(warm[first], warm[first + 1], fraction);
#else
    return vec3(1.0);
#endif
}
#endif

#if LAB_CHECKPOINT >= 7
// [snippet shader-light]
vec3 lightColor(vec3 point, float density) {
    vec3 color = transferColor(density);
    if (uLighting == 0) return color;
    vec3 gradient;
    for (int axis = 0; axis < 3; ++axis) {
        vec3 offset = vec3(0.0);
        offset[axis] = uSpacing;
        gradient[axis] = (densityAt(point + offset) - densityAt(point - offset)) / (2.0 * uSpacing);
    }
    vec3 light = normalize(vec3(-0.6, 0.8, 0.5));
    float facing = max(0.0, -dot(gradient, light) / sqrt(dot(gradient, gradient) + 0.25));
    float nearDensity = densityAt(point + 0.13 * light);
    float farDensity = densityAt(point + 0.32 * light);
    float sun = exp(-2.3 * (0.64 * nearDensity + 0.36 * farDensity));
    float direct = sun * (0.55 + 0.45 * facing);
    return color * mix(vec3(0.21, 0.34, 0.53), vec3(1.0, 0.98, 0.86), direct);
}
// [/snippet shader-light]
#endif

// [snippet fragment-main]
void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
#if LAB_CHECKPOINT <= 1
    result = vec4(uv, 0.2, 1.0);
#endif
#if LAB_CHECKPOINT >= 2
    // [snippet shader-ray]
    float tangent = tan(radians(50.0) * 0.5);
    vec3 horizontal = uRight * ((2.0 * uv.x - 1.0) * (uSize.x / uSize.y) * tangent);
    vec3 vertical = uUp * ((2.0 * uv.y - 1.0) * tangent);
    vec3 direction = normalize(uForward + horizontal + vertical);
    // [/snippet shader-ray]
#endif
#if LAB_CHECKPOINT == 2
    result = vec4(0.5 * direction + 0.5, 1.0);
#endif
#if LAB_CHECKPOINT >= 3
    float entry;
    float exit;
    if (!intervalFor(uOrigin, direction, entry, exit)) {
        result = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
#endif
#if LAB_CHECKPOINT == 3
    result = vec4(vec3((exit - entry) / 3.464102), 1.0);
#endif
#if LAB_CHECKPOINT == 4
    float density = densityAt(uOrigin + direction * ((entry + exit) * 0.5));
    result = vec4(vec3(density), 1.0);
#endif
#if LAB_CHECKPOINT >= 5
    // [snippet projection-modes]
    float length = exit - entry;
    int count = int(ceil(length / uStep));
    if (count > 512) {
        result = vec4(1.0, 0.0, 1.0, -1.0);
        return;
    }
    float maximum = 0.0;
    float integral = 0.0;
    vec3 color = vec3(0.0);
    float transmittance = 1.0;

    // [snippet shader-projections]
    for (int i = 0; i < 512; ++i) {
        if (i >= count) break;
        float start = entry + float(i) * uStep;
        float ds = min(uStep, exit - start);
        vec3 point = uOrigin + direction * (start + 0.5 * ds);
        float density = classify(densityAt(point));
        maximum = max(maximum, density);
        integral += density * ds;
        // [/snippet shader-projections]
#if LAB_CHECKPOINT >= 6
        // [snippet shader-alpha]
        if (uMode == 2 && density > 0.0 && uSigma > 0.0) {
            float segmentT = exp(-uSigma * density * ds);
            float alpha = 1.0 - segmentT;
            vec3 emission = transferColor(density);
#if LAB_CHECKPOINT >= 7
            emission = lightColor(point, density);
#endif
            color += transmittance * alpha * emission;
            transmittance *= segmentT;
        }
        // [/snippet shader-alpha]
#endif
#if LAB_CHECKPOINT >= 9
        // [snippet shader-early]
        if (uMode == 2 && uEarly != 0 && transmittance <= 0.0005) break;
        // [/snippet shader-early]
#endif
    }
    if (uMode == 0) result = vec4(vec3(maximum), 1.0);
    if (uMode == 1) result = vec4(vec3(integral / length), 1.0);
#if LAB_CHECKPOINT >= 6
    if (uMode == 2) result = vec4(color, transmittance);
#endif
    // [/snippet projection-modes]
#endif
}
// [/snippet fragment-main]
