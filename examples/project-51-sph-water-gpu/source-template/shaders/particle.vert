#version 430 core
// Read the current position bank directly; stride affects only drawing, not physics.
layout(std430,binding=0) readonly buffer Positions { vec4 positions[]; };
layout(std430,binding=1) readonly buffer Density { vec4 density[]; };
uniform uint uStride;
uniform vec3 uCamera;
uniform float uAspect;
out vec3 color;
void main() {
    uint i=uint(gl_VertexID)*uStride;
    vec3 p=positions[i].xyz-0.5;
    float x=cos(uCamera.x)*p.x+sin(uCamera.x)*p.z;
    float depth=-sin(uCamera.x)*p.x+cos(uCamera.x)*p.z;
    float y=cos(uCamera.y)*p.y-sin(uCamera.y)*depth;
    float z=sin(uCamera.y)*p.y+cos(uCamera.y)*depth;
    gl_Position=vec4(1.5*uCamera.z*x/uAspect,1.5*uCamera.z*y,-z/1.5,1.0);
    gl_PointSize=3.0;
    color=vec3(0.25,0.7,0.95);
#if LAB_CHECKPOINT >= 5
    float t=clamp((density[i].x/1000.0-0.7)/0.4,0.0,1.0);
    color=mix(vec3(0.15,0.45,0.9),vec3(0.9,0.7,0.3),t);
#endif
}
