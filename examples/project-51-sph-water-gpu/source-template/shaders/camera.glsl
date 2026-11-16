// Camera scaffold: world -> eye -> clip. Các renderer dùng cùng phép chiếu.
uniform vec3 uCamera;
uniform float uAspect;
const float focalLength = 2.1445069205095586;
const float nearPlane = 0.02;
const float farPlane = 12.0;

vec3 worldToEye(vec3 position) {
    vec3 p = position - vec3(0.5, 0.4, 0.5);
    float x = cos(uCamera.x) * p.x + sin(uCamera.x) * p.z;
    float depth = -sin(uCamera.x) * p.x + cos(uCamera.x) * p.z;
    float y = cos(uCamera.y) * p.y - sin(uCamera.y) * depth;
    float z = sin(uCamera.y) * p.y + cos(uCamera.y) * depth;
    return vec3(x, y, z - 1.75 / uCamera.z);
}

// [snippet eye-to-clip]
vec4 eyeToClip(vec3 p) {
    float a = (farPlane + nearPlane) / (nearPlane - farPlane);
    float b = 2.0 * farPlane * nearPlane / (nearPlane - farPlane);
    return vec4(focalLength * p.x / uAspect, focalLength * p.y, a * p.z + b, -p.z);
}

// [/snippet eye-to-clip]
