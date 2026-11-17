#version 430 core
#define WATER_SCENE
#include "shared/camera.glsl"
#include "water/lighting.glsl"
uniform sampler2D surfaceMap;
uniform bool fluidVisible;
layout(location = 0) out vec4 result;

void main() {
    vec2 pixel = gl_FragCoord.xy;
    vec2 uv = pixel / viewport;
    vec3 color = backgroundAt(pixel);
    vec2 surface = texture(surfaceMap, uv).rg;
    float z = surface.x;
    if (fluidVisible && z > 0.0) {
        vec2 texel = 1.0 / viewport;
        float left = texture(surfaceMap, uv - vec2(texel.x, 0)).r;
        float rightDepth = texture(surfaceMap, uv + vec2(texel.x, 0)).r;
        float bottom = texture(surfaceMap, uv - vec2(0, texel.y)).r;
        float top = texture(surfaceMap, uv + vec2(0, texel.y)).r;
        vec3 p = pointAt(pixel, z);
        vec3 dx = pointAt(pixel + vec2(1, 0), rightDepth) - p;
        vec3 dy = pointAt(pixel + vec2(0, 1), top) - p;
        if (rightDepth == 0.0 || abs(z - left) < abs(z - rightDepth))
            dx = p - pointAt(pixel - vec2(1, 0), left);
        if (top == 0.0 || abs(z - bottom) < abs(z - top))
            dy = p - pointAt(pixel - vec2(0, 1), bottom);
        // [snippet water-normal]
        vec3 view = normalize(eye - p);
        vec3 normal = cross(dx, dy);
        if (dot(normal, normal) < 1e-16)
            normal = view;
        else
            normal = normalize(normal);
        if (dot(normal, view) < 0.0)
            normal = -normal;
        // [/snippet water-normal]
        float path = max(0.0, surface.y);
        float cosine = max(0.0, dot(normal, view));
        // [snippet water-optics]
        float fresnel = .0204 + .9796 * pow(1.0 - cosine, 5.0);
        vec3 reflected = reflect(-view, normal);
        vec3 sky = waterEnvironment(reflected);
        vec2 bend = vec2(dot(normal, right), dot(normal, up)) * path * focal * .32 / z;
        vec3 behind = backgroundAt(clamp(pixel - bend, vec2(0), viewport - 1.0));
        vec3 transmission = exp(-vec3(.45, .12, .06) * path);
        vec3 scatter = vec3(.015, .08, .12);
        color = mix(behind * transmission + scatter * (1.0 - transmission), sky, fresnel);
        vec3 halfVector = normalize(view + normalize(vec3(-.36, .85, .38)));
        color += vec3(.045) * pow(max(dot(normal, halfVector), 0.0), 128.0);
        // Subpixel spray has partial coverage. This changes display only, not N or SPH.
        float coverage = 1.0 - exp(-65.0 * path);
        color = mix(backgroundAt(pixel), color, coverage);
        // [/snippet water-optics]
    }
    // Lighting is linear; encode once for the default non-sRGB framebuffer.
    result = vec4(pow(max(color, vec3(0)), vec3(1.0 / 2.2)), 1);
}
