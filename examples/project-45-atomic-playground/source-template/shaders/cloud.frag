#version 430 core
in vec3 pointColor;
in float energy;
uniform float opacity;
layout(location=0) out vec4 color;
void main() {
    vec2 q=gl_PointCoord*2.0-1.0;
    float radiusSquared=dot(q,q);
    if(radiusSquared>1.0) discard;
#if LAB_CHECKPOINT >= 6
    float weight=exp(-3.0*radiusSquared)*opacity*energy;
#else
    // A flat disk is the baseline; the soft Gaussian and HDR arrive in lesson 6.
    float weight=0.4*opacity*energy;
#endif
    color=vec4(pointColor*weight,weight);
}
