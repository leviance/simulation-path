#version 430 core
in vec3 worldPoint;
in vec3 worldNormal;
uniform vec3 cameraEye;
uniform int normalView;
out vec4 color;

void main() {
    vec3 n = normalize(worldNormal);
    if (normalView == 1) {
        color = vec4(n * 0.5 + 0.5, 1);
        return;
    }
    vec3 light = normalize(vec3(-0.4, 0.8, 0.7));
    vec3 view = normalize(cameraEye - worldPoint);
    vec3 halfway = light + view;
    float specular = 0.0;
    if (dot(halfway,halfway) > 1e-10)
        specular = 0.25 * pow(max(0.0,dot(n,normalize(halfway))),32.0);
    float diffuse = max(0.0,dot(n,light));
    float rim = pow(1.0 - max(0.0,dot(n,view)),3.0);
    vec3 base = mix(vec3(0.15,0.37,0.42), vec3(0.38,0.70,0.67), clamp(worldPoint.y + 0.5,0.0,1.0));
    vec3 linear = base * (0.25 + 0.85 * diffuse) + vec3(specular) + vec3(0.10,0.19,0.22) * rim;
    color = vec4(pow(linear / (linear + vec3(0.7)),vec3(1.0/2.2)),1);
}
