#version 430 core
out vec4 fragColor;
struct Pixel { vec4 color;uvec4 work;vec4 surface; };
layout(std430,binding=0) readonly buffer FullImage { Pixel fullPixels[]; };
layout(std430,binding=1) readonly buffer PreviewImage { Pixel previewPixels[]; };
uniform vec2 viewportSize;
uniform vec2 viewportOrigin;
uniform uint generation;
uniform int viewMode;
uniform int useFinal;
uniform int maximumSteps;
uniform int maximumIterations;
void main() {
    vec2 uv=(gl_FragCoord.xy-viewportOrigin)/viewportSize;
    uv.y=1.0-uv.y;
    ivec2 p=clamp(ivec2(uv*vec2(120,68)),ivec2(0),ivec2(119,67));
    Pixel record=previewPixels[p.y*120+p.x];
    if(useFinal==1) {
        ivec2 f=clamp(ivec2(uv*vec2(960,540)),ivec2(0),ivec2(959,539));
        Pixel candidate=fullPixels[f.y*960+f.x];
        if(candidate.work.w==generation&&candidate.color.w>0.0) record=candidate;
    }
    if(record.work.w!=generation||record.color.w<=0.0) { fragColor=vec4(0.025,0.04,0.06,1);return; }
    vec3 color=record.color.rgb/record.color.w;
    if(viewMode==1) {
        float t=clamp(float(record.work.x)/record.color.w/float(maximumSteps),0.0,1.0);
        color=mix(vec3(0.03,0.14,0.25),vec3(1.0,0.27,0.06),t);
    }
    if(viewMode==2) {
        float t=clamp(log(1.0+float(record.work.y)/record.color.w)/log(1.0+float((maximumSteps+35)*maximumIterations)),0.0,1.0);
        color=mix(vec3(0.04,0.10,0.18),vec3(0.97,0.73,0.19),t);
    }
    if(viewMode==3) {
        color=vec3(0.03,0.07,0.13);
        if((record.work.z&1u)!=0u) color=vec3(0.2,0.85,0.66);
        if((record.work.z&4u)!=0u) color=vec3(0.85,0.28,0.08);
        if((record.work.z&8u)!=0u) color=vec3(0.35,0.45,1.0);
        if((record.work.z&16u)!=0u) color=vec3(0.9,0.02,0.6);
    }
    if(viewMode==4) color=record.surface.yzw*0.5+0.5;
    if(viewMode==0) color=pow(color/(vec3(1.0)+color),vec3(1.0/2.2));
    fragColor=vec4(color,1.0);
}
