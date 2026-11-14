#version 430 core
#include "density.glsl"
struct PointRecord { vec4 positionDensity; vec4 signPadding; };
layout(std430,binding=2) readonly buffer Points { PointRecord points[]; };
uniform vec3 cameraEye,cameraRight,cameraUp,cameraForward;
uniform float tanHalfFov,aspect,pointSize,referenceDistance,rMax;
uniform int orbital,latticeMode,clipAxis;
uniform float clipOffset;
out vec3 pointColor;
out float energy;
uniform int palette,densityBoost;
uniform int showProbe;
uniform vec4 probeSphere;

void main() {
    vec3 p;
    float density,phase;
    if (latticeMode != 0) {
        uint id=uint(gl_VertexID);
        vec3 q=vec3(id%48u,(id/48u)%48u,id/2304u);
        p=((q+0.5)/48.0*2.0-1.0)*rMax;
        vec2 value=orbitalDensity(orbital,p);
        density=value.x; phase=value.y;
    } else {
        p=points[gl_VertexID].positionDensity.xyz;
        density=points[gl_VertexID].positionDensity.w;
        phase=points[gl_VertexID].signPadding.x;
    }
    vec3 relative=p-cameraEye;
    float depth=dot(relative,cameraForward);
    bool clipped=clipAxis>=0 && p[clipAxis]>clipOffset;
    if (depth<=0.02 || clipped) {
        gl_Position=vec4(3,3,3,1); gl_PointSize=1; pointColor=vec3(0);energy=0; return;
    }
    gl_Position=vec4(dot(relative,cameraRight)/(aspect*tanHalfFov),dot(relative,cameraUp)/tanHalfFov,depth-0.04,depth);
    gl_PointSize=clamp(pointSize*referenceDistance/depth,1.0,14.0);
    pointColor=mix(vec3(0.18,0.55,1.0),vec3(1.0,0.48,0.13),step(0.0,phase));
    if(palette==1) pointColor=mix(vec3(0.1,0.85,0.7),vec3(0.6,0.25,1.0),clamp(length(p)/rMax,0,1));
    if(palette==2) pointColor=mix(vec3(0.08,0.25,0.8),vec3(1.0,0.9,0.2),clamp(-log(max(density,1e-12))/20.0,0,1));
    if (showProbe != 0 && distance(p, probeSphere.xyz) <= probeSphere.w)
        pointColor = mix(pointColor, vec3(0.3, 1.0, 0.75), 0.75);
    energy=clamp(referenceDistance/depth,0.2,2.0);
    if (densityBoost!=0) energy*=1.0+min(2.0,sqrt(max(density,0.0))*8.0);
    if (latticeMode!=0) energy*=min(1.0,density*pow(rMax,3.0)*0.03);
}
