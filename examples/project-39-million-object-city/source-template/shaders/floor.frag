#version 430 core
in vec3 vWorld;
uniform float uCityOffset;
out vec4 color;
void main() {
    vec2 position = vWorld.xz + uCityOffset;
    vec2 block = mod(position + vec2(10.0),174.0);
    float avenue = max(step(160.0,block.x),step(160.0,block.y));
    vec2 local = mod(position + vec2(10.0),20.0);
    float lane = max(step(15.0,local.x),step(15.0,local.y));
    vec3 pavement = mix(vec3(0.26,0.31,0.33),vec3(0.13,0.18,0.21),max(lane,avenue));
    // Road intersections leave a small tiled plaza, with a clear margin around it.
    if (block.x > 162.0 && block.x < 172.0 && block.y > 162.0 && block.y < 172.0) {
        float tile = mod(floor(vWorld.x) + floor(vWorld.z),2.0);
        pavement = mix(vec3(0.29,0.46,0.36),vec3(0.37,0.54,0.43),tile);
    }
    float lineX = (1.0-step(0.14,abs(block.x-167.0))) * step(0.45,fract(position.y*0.07));
    float lineZ = (1.0-step(0.14,abs(block.y-167.0))) * step(0.45,fract(position.x*0.07));
    color = vec4(mix(pavement,vec3(0.86,0.75,0.38),max(lineX,lineZ)),1.0);
}
