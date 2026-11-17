#version 430 core
#include "shared/camera.glsl"
flat in vec3 center;
flat in vec2 diagnostic;
uniform float radius;
uniform float volumeRatio;
uniform int pass;
layout(location = 0) out vec4 result;

void main() {
    vec3 ray = rayAt(gl_FragCoord.xy);
    vec3 delta = eye - center;
    float a = dot(ray, ray), b = dot(delta, ray), c = dot(delta, delta) - radius * radius;
    float discriminant = b * b - a * c;
    if (discriminant <= 0.0)
        discard;
    // [snippet sphere-depth]
    float root = sqrt(discriminant);
    float front = (-b - root) / a;
    float back = (-b + root) / a;
    vec3 hit = eye + front * ray;
    if (front < .04 || any(lessThan(hit, vec3(-.015))) || any(greaterThan(hit, vec3(1.665, .84, 1.115))))
        discard;
    if (obstacle.w > 0.0 && sphereHit(ray, obstacle) < front)
        discard;
    gl_FragDepth = 20.0 / (20.0 - .04) - 20.0 * .04 / ((20.0 - .04) * front);
    if (pass == 0)
        result = vec4(front, 0, 0, 1);
    // [/snippet sphere-depth]
    // [snippet thickness]
    if (pass == 1)
        result = vec4((back - front) * sqrt(a) * volumeRatio, 0, 0, 1);
    // [/snippet thickness]
    if (pass >= 2) {
        vec3 normal = normalize(hit - center);
        vec3 base = vec3(.06, .48, .72);
        if (pass == 3)
            base = mix(vec3(.12, .30, .92), vec3(.98, .34, .10), clamp((diagnostic.x - 700.0) / 500.0, 0.0, 1.0));
        if (pass == 4)
            base = mix(vec3(.10, .32, .70), vec3(1, .65, .1), clamp(diagnostic.y / 3.0, 0.0, 1.0));
        float light = .28 + .72 * max(dot(normal, normalize(vec3(-.4, .8, .4))), 0.0);
        result = vec4(base * light, 1);
    }
}
