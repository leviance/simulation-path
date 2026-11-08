#version 430 core
layout(std430,binding=0) readonly buffer Positions { vec4 positions[]; };
layout(std430,binding=1) readonly buffer Normals { vec4 normals[]; };
uniform mat4 uViewProjection;
uniform uint uSide;
uniform int uPoints;
uniform uint uPointStride;
uniform uint uSelected;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
out float vStrain;
flat out int vPinned;
void main() {
    uint id = uint(gl_VertexID);
    if (uPoints != 0) { id *= uPointStride; }
    vec4 position = positions[id];
    vWorld = position.xyz;
    vNormal = normals[id].xyz;
    vStrain = normals[id].w;
    vPinned = int(position.w == 0.0);
    vUv = vec2(id % uSide,id / uSide) / float(uSide-1u);
    gl_Position = uViewProjection * vec4(vWorld,1.0);
    gl_PointSize = 3.0;
    if (vPinned != 0) { gl_PointSize = 6.0; }
    if (id == uSelected) { gl_PointSize = 13.0; }
}
