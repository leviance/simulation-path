#version 430 core
#include "camera.glsl"
uniform int uGeometry;
out vec3 world;

void main() {
    const vec2 corners[6] = vec2[6](vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 0), vec2(1, 1), vec2(0, 1));
    if (uGeometry == 0) {
        vec2 p = mix(vec2(-0.2), vec2(1.2), corners[gl_VertexID]);
        world = vec3(p.x, -0.004, p.y);
    } else {
        // Ba nhóm cạnh theo X/Y/Z, bốn cạnh mỗi nhóm, hai đầu mỗi cạnh.
        int edge = gl_VertexID / 2;
        int direction = edge / 4;
        int pair = edge % 4;
        float end = float(gl_VertexID % 2);
        vec2 fixedCoordinates = vec2(float(pair % 2), float(pair / 2));
        world = vec3(end, fixedCoordinates);
        if (direction == 1)
            world = vec3(fixedCoordinates.x, end, fixedCoordinates.y);
        if (direction == 2)
            world = vec3(fixedCoordinates, end);
    }
    gl_Position = eyeToClip(worldToEye(world));
}
