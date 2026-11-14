#version 430 core
in vec2 uv;
uniform sampler2D accumulation;
uniform float exposure;
out vec4 color;
void main() {
    vec3 radiance=texture(accumulation,uv).rgb;
    vec3 mapped=vec3(1)-exp(-max(radiance,vec3(0))*exposure);
    color=vec4(pow(mapped,vec3(1.0/2.2))+vec3(0.015,0.02,0.035),1);
}
