#version 430 core
in vec3 vNormal;
in vec3 vWorld;
in vec3 vColor;
in vec3 vLocal;
flat in uint vSelected;
flat in uint vAccepted;
uniform vec3 uEye;
uniform int uDebug;
out vec4 color;
void main() {
    vec3 normal = normalize(vNormal);
    vec3 sunlight = normalize(vec3(-0.45,0.8,0.25));
    float diffuse = max(dot(normal,sunlight),0.0);
    vec3 base = vColor;
    // Windows reveal the scale of buildings without loading a commercial texture pack.
    float horizontal = vLocal.x + vLocal.z;
    float windowMask = step(0.25,fract(horizontal * 0.39)) * step(0.27,fract(vWorld.y * 0.38));
    if (abs(normal.y) < 0.6) { base = mix(base,vec3(0.09,0.24,0.32),windowMask * 0.76); }
    vec3 lit = base * (0.34 + diffuse * 0.70);
    lit += pow(max(dot(reflect(-sunlight,normal),normalize(uEye-vWorld)),0.0),24.0) * 0.20;
    if (uDebug != 0) {
        lit = vec3(0.88,0.25,0.25);
        if (vAccepted != 0u) { lit = vec3(0.13,0.8,0.56); }
    }
    if (vSelected != 0u) { lit = mix(lit,vec3(1.0,0.76,0.18),0.75); }
    color = vec4(lit,1.0);
}
