#version 430 core
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
in float vStrain;
flat in int vPinned;
uniform vec3 uEye;
uniform int uUseNormals;
uniform int uPoints;
uniform int uWire;
uniform int uStrain;
out vec4 color;
void main() {
    if (uPoints != 0) {
        if (length(gl_PointCoord-vec2(0.5)) > 0.5) { discard; }
        color = vec4(0.2,0.95,0.75,1.0);
        if (vPinned != 0) { color = vec4(1.0,0.65,0.18,1.0); }
        return;
    }
    if (uWire != 0) { color = vec4(0.05,0.12,0.17,1.0); return; }
    vec3 n = normalize(cross(dFdx(vWorld),dFdy(vWorld)));
    if (uUseNormals != 0) { n = normalize(vNormal); }
    if (!gl_FrontFacing) { n = -n; }
    float checker = mod(floor(vUv.x*16.0)+floor(vUv.y*16.0),2.0);
    vec3 base = mix(vec3(0.16,0.47,0.67),vec3(0.34,0.68,0.78),checker);
    if (!gl_FrontFacing) { base = mix(vec3(0.69,0.38,0.16),vec3(0.88,0.65,0.33),checker); }
    vec2 stripe = abs(fract(vUv*32.0)-0.5);
    float seam = 1.0-smoothstep(0.465,0.485,max(stripe.x,stripe.y));
    base *= 0.86 + 0.14*seam;
    if (uStrain != 0) { base = mix(vec3(0.08,0.5,0.8),vec3(1.0,0.18,0.08),clamp(vStrain/0.15,0.0,1.0)); }
    vec3 light = normalize(vec3(-0.4,0.85,0.45));
    float diffuse = max(dot(n,light),0.0);
    float rim = pow(1.0-abs(dot(n,normalize(uEye-vWorld))),3.0);
    vec3 lit = base*(0.35+0.7*diffuse)+vec3(0.13,0.19,0.23)*rim;
    color = vec4(lit,1.0);
}
