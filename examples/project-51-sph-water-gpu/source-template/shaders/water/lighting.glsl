// A small procedural environment: broad light shapes, not one shiny dot on every particle.
vec3 waterEnvironment(vec3 direction) {
    float horizon = smoothstep(-.15, .85, direction.y);
    vec3 color = mix(vec3(.35, .40, .45), vec3(1.50, 1.70, 1.90), horizon);
    float windowLight = exp(-12.0 * pow(direction.x + .45, 2.0) - 18.0 * pow(direction.z + .60, 2.0));
    windowLight *= smoothstep(.10, .65, direction.y);
    // Environment radiance may exceed 1; Fresnel then gives a visible reflection on clear water.
    return mix(color, vec3(4.0, 4.0, 3.8), .92 * windowLight);
}
