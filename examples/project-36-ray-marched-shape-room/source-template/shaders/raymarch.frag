#version 330 core

in vec2 vNdc;
out vec4 fragColor;

#if LAB_CHECKPOINT >= 1
uniform vec2 uResolution;
#endif
#if LAB_CHECKPOINT >= 2
uniform vec3 uCameraPosition;
uniform vec3 uCameraTarget;
#endif
#if LAB_CHECKPOINT >= 4
uniform int uMaximumSteps;
uniform float uHitEpsilon;
#endif
#if LAB_CHECKPOINT >= 8
uniform float uTime;
#endif
#if LAB_CHECKPOINT >= 9
uniform int uDebugView;
#endif

#if LAB_CHECKPOINT >= 2
vec3 makeCameraRay(vec2 fragmentCoordinate) {
    vec2 safeResolution = max(uResolution, vec2(1.0));
    vec2 centered = (2.0 * fragmentCoordinate - safeResolution) / safeResolution.y;
    vec3 forward = normalize(uCameraTarget - uCameraPosition);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = normalize(cross(right, forward));
    float focalLength = 1.0 / tan(radians(60.0) * 0.5);
    return normalize(right * centered.x + up * centered.y + forward * focalLength);
}
#endif

#if LAB_CHECKPOINT >= 3
float sdSphere(vec3 point, vec3 center, float radius) {
    return length(point - center) - radius;
}

#if LAB_CHECKPOINT >= 6
float sdBox(vec3 point, vec3 center, vec3 halfSize) {
    vec3 q = abs(point - center) - halfSize;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 point, vec3 center, vec2 radii) {
    vec3 local = point - center;
    vec2 q = vec2(length(local.xz) - radii.x, local.y);
    return length(q) - radii.y;
}
#endif

struct SceneSample {
    float distance;
    int materialId;
};

SceneSample nearer(SceneSample current, SceneSample candidate) {
    return candidate.distance < current.distance ? candidate : current;
}

SceneSample sampleScene(vec3 point) {
    SceneSample sample = SceneSample(
        sdSphere(point, vec3(-1.0, -0.18, 0.15), 0.82),
        1
    );
#if LAB_CHECKPOINT >= 6
    sample = nearer(
        sample,
        SceneSample(sdBox(point, vec3(1.0, -0.32, 0.1), vec3(0.62, 0.68, 0.62)), 2)
    );
    sample = nearer(
        sample,
        SceneSample(sdTorus(point, vec3(0.05, 0.32, -1.25), vec2(0.72, 0.22)), 3)
    );
#endif
#if LAB_CHECKPOINT >= 7
    sample = nearer(sample, SceneSample(point.y + 1.0, 4));
    sample = nearer(sample, SceneSample(2.35 - point.y, 4));
    sample = nearer(sample, SceneSample(point.z + 3.1, 4));
    sample = nearer(sample, SceneSample(point.x + 3.5, 4));
    sample = nearer(sample, SceneSample(3.5 - point.x, 4));
#endif
    return sample;
}
#endif

#if LAB_CHECKPOINT >= 4
bool invalidNumber(float value) {
    return isnan(value) || isinf(value);
}

bool invalidPosition(vec3 value) {
    return any(isnan(value)) || any(isinf(value));
}

struct MarchResult {
    bool hit;
    float traveled;
    int steps;
    int materialId;
    vec3 position;
};

MarchResult marchRay(vec3 origin, vec3 direction) {
    MarchResult result = MarchResult(false, 0.0, 0, 0, origin);
    for (int step = 0; step < 160; ++step) {
        if (step >= uMaximumSteps) {
            break;
        }
        result.position = origin + direction * result.traveled;
        SceneSample sample = sampleScene(result.position);
        result.steps = step + 1;
        if (invalidPosition(result.position) || invalidNumber(sample.distance)) {
            result.traveled = 20.0;
            return result;
        }
        if (sample.distance <= uHitEpsilon) {
            result.hit = true;
            result.materialId = sample.materialId;
            return result;
        }
        result.traveled += sample.distance;
        if (invalidNumber(result.traveled) || result.traveled >= 20.0) {
            result.traveled = 20.0;
            return result;
        }
    }
    return result;
}
#endif

#if LAB_CHECKPOINT >= 5
vec3 estimateNormal(vec3 point) {
    float epsilon = 0.001;
    vec2 offset = vec2(epsilon, 0.0);
    return normalize(vec3(
        sampleScene(point + offset.xyy).distance - sampleScene(point - offset.xyy).distance,
        sampleScene(point + offset.yxy).distance - sampleScene(point - offset.yxy).distance,
        sampleScene(point + offset.yyx).distance - sampleScene(point - offset.yyx).distance
    ));
}

vec3 materialColor(int materialId, vec3 point) {
    if (materialId == 1) return vec3(0.20, 0.56, 0.96);
    if (materialId == 2) return vec3(0.96, 0.43, 0.22);
    if (materialId == 3) return vec3(0.73, 0.40, 0.95);
    float checker = mod(floor(point.x) + floor(point.z), 2.0);
    return mix(vec3(0.17, 0.20, 0.27), vec3(0.25, 0.29, 0.37), checker);
}
#endif

#if LAB_CHECKPOINT >= 8
float softShadow(vec3 origin, vec3 direction, float maximumDistance) {
    float visibility = 1.0;
    float traveled = 0.02;
    for (int step = 0; step < 48 && traveled < maximumDistance; ++step) {
        float distance = sampleScene(origin + direction * traveled).distance;
        if (invalidNumber(distance)) return 1.0;
        if (distance < 0.001) return 0.0;
        visibility = min(visibility, 14.0 * distance / traveled);
        traveled += clamp(distance, 0.01, 0.35);
    }
    return clamp(visibility, 0.0, 1.0);
}
#endif

void main() {
#if LAB_CHECKPOINT >= 4
    vec3 rayDirection = makeCameraRay(gl_FragCoord.xy);
    MarchResult result = marchRay(uCameraPosition, rayDirection);

#if LAB_CHECKPOINT >= 9
    if (uDebugView == 1) {
        float stepRatio = float(result.steps) / float(max(uMaximumSteps, 1));
        fragColor = vec4(stepRatio, 0.25, 1.0 - stepRatio, 1.0);
        return;
    }
    if (uDebugView == 2) {
        fragColor = vec4(vec3(result.hit ? 1.0 : 0.0), 1.0);
        return;
    }
#endif

    if (!result.hit) {
        vec3 sky = mix(vec3(0.025, 0.04, 0.08), vec3(0.10, 0.16, 0.26), rayDirection.y * 0.5 + 0.5);
        fragColor = vec4(sky, 1.0);
        return;
    }

#if LAB_CHECKPOINT >= 5
    vec3 normal = estimateNormal(result.position);
#if LAB_CHECKPOINT >= 9
    if (uDebugView == 3) {
        fragColor = vec4(normal * 0.5 + 0.5, 1.0);
        return;
    }
#endif
#if LAB_CHECKPOINT >= 8
    vec3 lightPosition = vec3(2.4 + sin(uTime * 0.35) * 0.6, 2.0, 3.0);
#else
    vec3 lightPosition = vec3(2.4, 2.0, 3.0);
#endif
    vec3 toLight = lightPosition - result.position;
    float lightDistance = length(toLight);
    vec3 lightDirection = toLight / max(lightDistance, 0.0001);
    float diffuse = max(dot(normal, lightDirection), 0.0);
#if LAB_CHECKPOINT >= 8
    float visibility = softShadow(
        result.position + normal * (uHitEpsilon * 3.0),
        lightDirection,
        lightDistance
    );
#else
    float visibility = 1.0;
#endif
    vec3 baseColor = materialColor(result.materialId, result.position);
    vec3 color = baseColor * (0.16 + diffuse * visibility * 0.84);
    color *= 1.0 - 0.018 * float(result.steps);
    fragColor = vec4(pow(max(color, 0.0), vec3(1.0 / 2.2)), 1.0);
#else
    fragColor = vec4(0.18, 0.62, 0.96, 1.0);
#endif
#elif LAB_CHECKPOINT >= 3
    vec3 rayDirection = makeCameraRay(gl_FragCoord.xy);
    vec3 samplePoint = uCameraPosition + rayDirection * 4.0;
    float distance = sdSphere(samplePoint, vec3(-1.0, -0.18, 0.15), 0.82);
    float edge = exp(-abs(distance) * 18.0);
    vec3 signColor = distance < 0.0 ? vec3(0.95, 0.32, 0.24) : vec3(0.16, 0.50, 0.92);
    fragColor = vec4(mix(signColor * 0.24, vec3(1.0), edge), 1.0);
#elif LAB_CHECKPOINT >= 2
    vec3 rayDirection = makeCameraRay(gl_FragCoord.xy);
    fragColor = vec4(rayDirection * 0.5 + 0.5, 1.0);
#elif LAB_CHECKPOINT >= 1
    vec2 safeResolution = max(uResolution, vec2(1.0));
    vec2 uv = gl_FragCoord.xy / safeResolution;
    vec2 grid = abs(fract(uv * 10.0) - 0.5);
    float line = 1.0 - smoothstep(0.45, 0.49, max(grid.x, grid.y));
    fragColor = vec4(mix(vec3(uv, 0.25), vec3(0.85), line * 0.22), 1.0);
#else
    fragColor = vec4(0.08, 0.18, 0.34, 1.0);
#endif
}
