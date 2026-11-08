#version 430 core
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
struct Object { vec4 centerRadius; vec3 halfSize; uint mesh; vec3 color; uint id; };
layout(std430,binding=0) readonly buffer Objects { Object objects[]; };
layout(std430,binding=1) readonly buffer Visible { uint visibleIDs[]; };
layout(std430,binding=2) readonly buffer Statistics { uvec4 counts; };
uniform mat4 uViewProjection;
uniform uint uGroup;
uniform uint uSelected;
uniform int uDebug;
uniform vec4 uPlanes[6];
out vec3 vNormal;
out vec3 vWorld;
out vec3 vColor;
out vec3 vLocal;
flat out uint vSelected;
flat out uint vAccepted;
void main() {
    uint offset = 0u;
    for (uint group = 0u; group < uGroup; ++group) { offset += counts[group]; }
    uint objectID = visibleIDs[offset + uint(gl_InstanceID)];
    Object object = objects[objectID];
    vec3 world = object.centerRadius.xyz + aPosition * object.halfSize;
    vAccepted = 1u;
    for (int plane = 0; plane < 6; ++plane) {
        if (dot(uPlanes[plane],vec4(object.centerRadius.xyz,1.0)) < -object.centerRadius.w) { vAccepted = 0u; }
    }
    vNormal = normalize(aNormal / object.halfSize);
    vWorld = world;
    vColor = object.color;
    vLocal = aPosition * object.halfSize;
    vSelected = uint(object.id == uSelected);
    gl_Position = uViewProjection * vec4(world,1.0);
}
