#version 430 core
in vec3 vWorld;
in vec3 vNormal;
uniform vec3 uColor;
uniform int uGrid;
out vec4 color;
void main() {
    vec3 base = uColor;
    if (uGrid != 0) {
        vec2 grid = abs(fract(vWorld.xz)-0.5);
        float line = smoothstep(0.46,0.49,max(grid.x,grid.y));
        base = mix(vec3(0.12,0.17,0.21),vec3(0.27,0.34,0.38),line);
    }
    float diffuse = max(dot(normalize(vNormal),normalize(vec3(-0.4,0.85,0.45))),0.0);
    color = vec4(base*(0.38+0.67*diffuse),1.0);
}
