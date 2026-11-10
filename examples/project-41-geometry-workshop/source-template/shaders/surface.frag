#version 330 core

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

in vec3 worldPosition;
in vec3 surfaceNormal;
in vec2 surfaceUv;

uniform vec3 cameraPosition;
uniform vec3 pigment;
uniform int displayMode;
out vec4 color;

void main() {
    if (displayMode == 2) {
        color = vec4(0.10, 0.19, 0.26, 1.0);
        return;
    }

    vec3 n = normalize(surfaceNormal);
#if LAB_CHECKPOINT >= 4
    // A Mobius strip cannot carry one continuous global normal. Illuminate the visible face.
    if (!gl_FrontFacing) n = -n;
#endif
    vec3 viewDirection = normalize(cameraPosition - worldPosition);
    vec3 key = normalize(vec3(0.35, 0.85, -0.62));
    vec3 fill = normalize(vec3(-0.72, 0.28, 0.52));

    // Integer periods close the UV seam; cosine is symmetric under v -> 1-v.
    const float tau = 6.2831853;
    float ridge = 0.5 + 0.5 * cos(tau * surfaceUv.x * 16.0);
    float section = 0.5 + 0.5 * cos(tau * surfaceUv.y * 8.0);
    vec3 base = pigment * (0.88 + 0.12 * ridge + 0.10 * section);
    if (displayMode == 1) {
        base = vec3(0.17 + 0.69 * surfaceUv.x, 0.25 + 0.59 * surfaceUv.y, 0.68);
    }

    float diffuse = 0.31 + 0.68 * max(dot(n, key), 0.0) + 0.28 * max(dot(n, fill), 0.0);
    float highlight = pow(max(dot(n, normalize(key + viewDirection)), 0.0), 39.0);
    float rim = pow(1.0 - max(dot(n, viewDirection), 0.0), 3.0);
    vec3 rgb = base * diffuse + vec3(0.36, 0.29, 0.20) * highlight;
    rgb += vec3(0.12, 0.22, 0.31) * rim;
    color = vec4(clamp(rgb, 0.0, 1.0), 1.0);
}
