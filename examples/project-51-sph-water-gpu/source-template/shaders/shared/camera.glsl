uniform vec3 eye;
uniform vec3 forward;
uniform vec3 right;
uniform vec3 up;
uniform vec2 viewport;
uniform float focal;
uniform vec4 obstacle;

vec3 rayAt(vec2 pixel) {
    return forward + right * ((pixel.x - viewport.x * .5) / focal) + up * ((pixel.y - viewport.y * .5) / focal);
}

vec3 pointAt(vec2 pixel, float depth) {
    return eye + rayAt(pixel) * depth;
}

float sphereHit(vec3 ray, vec4 sphere) {
    vec3 delta = eye - sphere.xyz;
    float a = dot(ray, ray), b = dot(delta, ray), c = dot(delta, delta) - sphere.w * sphere.w;
    float discriminant = b * b - a * c;
    if (discriminant < 0.0)
        return 1e10;
    float t = (-b - sqrt(discriminant)) / a;
    if (t <= .04)
        return 1e10;
    return t;
}
#ifdef WATER_SCENE
vec3 backgroundAt(vec2 pixel) {
    vec3 ray = rayAt(pixel);
    float sky = clamp(.5 + .5 * normalize(ray).y, 0.0, 1.0);
    vec3 color = mix(vec3(.006, .012, .022), vec3(.028, .045, .075), sky);
    float t = -eye.y / ray.y;
    if (t > 0.0) {
        vec3 p = eye + t * ray;
        if (p.x >= -.012 && p.x <= 1.662 && p.z >= -.012 && p.z <= 1.112) {
            vec2 grid = abs(fract(p.xz * 10.0 - .5) - .5) / max(fwidth(p.xz * 10.0), vec2(.002));
            float line = 1.0 - clamp(min(grid.x, grid.y), 0.0, 1.0);
            color = mix(vec3(.08, .13, .16), vec3(.17, .24, .29), line * .65);
            float shadow = exp(-pow(length((p.xz - vec2(.40, .55)) / vec2(.55, .45)), 2.0));
            color *= 1.0 - .13 * shadow;
        }
    }
    if (obstacle.w > 0.0) {
        float hit = sphereHit(ray, obstacle);
        if (hit < 1e9 && hit < t) {
            vec3 normal = normalize(eye + ray * hit - obstacle.xyz);
            float light = .25 + .75 * max(0.0, dot(normal, normalize(vec3(-.4, .8, .4))));
            color = vec3(.86, .36, .10) * light;
        }
    }
    return color;
}
#endif
