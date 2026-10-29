#version 330 core
out vec4 fragColor;

#if LAB_CHECKPOINT >= 1
uniform vec2 uResolution;
#endif
#if LAB_CHECKPOINT >= 2
uniform vec3 uCameraForward;
uniform vec3 uCameraRight;
uniform vec3 uCameraUp;
uniform float uTanHalfFov;
#endif
#if LAB_CHECKPOINT >= 4
uniform vec3 uCameraPosition;
uniform int uMaximumSteps;
uniform float uHitEpsilon;
uniform float uMaximumDistance;
#endif
#if LAB_CHECKPOINT >= 3
uniform float uSphereRadius;
#endif
#if LAB_CHECKPOINT >= 5
uniform float uNormalEpsilon;
#endif
#if LAB_CHECKPOINT >= 6
uniform float uTorusMinorRadius;
uniform int uPrimitiveMask;
#endif
#if LAB_CHECKPOINT >= 8
uniform float uTime;
#endif
#if LAB_CHECKPOINT >= 10
uniform int uDebugView;
#endif

bool invalidNumber(float value) {
    return isnan(value) || isinf(value);
}

bool invalidPosition(vec3 value) {
    return any(isnan(value)) || any(isinf(value));
}

#if LAB_CHECKPOINT >= 2
// [snippet:gpu-camera-ray]
vec3 makeCameraRay(vec2 fragmentCoordinate) {
    vec2 centered = (2.0 * fragmentCoordinate - uResolution) / uResolution.y;
    return normalize(uCameraForward + uCameraRight * centered.x * uTanHalfFov + uCameraUp * centered.y * uTanHalfFov);
}
// [/snippet:gpu-camera-ray]
#endif

#if LAB_CHECKPOINT >= 3
float sdSphere(vec3 point, vec3 center, float radius) {
    return length(point - center) - radius;
}

struct SceneSample {
    float distance;
    int materialId;
};

SceneSample nearer(SceneSample current, SceneSample candidate) {
    if (candidate.distance < current.distance) {
        return candidate;
    }
    return current;
}

#if LAB_CHECKPOINT >= 6
float sdBox(vec3 point, vec3 center, vec3 halfSize) {
    vec3 q = abs(point - center) - halfSize;
    float outside = length(max(q, vec3(0.0)));
    float inside = min(max(q.x, max(q.y, q.z)), 0.0);
    return outside + inside;
}

float sdTorus(vec3 local, float majorRadius, float minorRadius) {
    vec2 q = vec2(length(local.xz) - majorRadius, local.y);
    return length(q) - minorRadius;
}

vec3 torusLocal(vec3 point) {
    vec3 shifted = point - vec3(0.05, -0.16, -1.25);
    const float cosine = 0.5;
    const float sine = 0.8660254037844386;
    return vec3(shifted.x, cosine * shifted.y + sine * shifted.z, -sine * shifted.y + cosine * shifted.z);
}
#endif

SceneSample sampleScene(vec3 point) {
    SceneSample sample = SceneSample(1e6, 0);
#if LAB_CHECKPOINT >= 6
    if ((uPrimitiveMask & 1) != 0) {
#endif
        sample = nearer(sample, SceneSample(sdSphere(point, vec3(-1.0, -0.18, 0.15), uSphereRadius), 1));
#if LAB_CHECKPOINT >= 6
    }
    if ((uPrimitiveMask & 2) != 0) {
        sample = nearer(sample, SceneSample(sdBox(point, vec3(1.0, -0.32, 0.1), vec3(0.62, 0.68, 0.62)), 2));
    }
    if ((uPrimitiveMask & 4) != 0) {
        sample = nearer(sample, SceneSample(sdTorus(torusLocal(point), 0.72, uTorusMinorRadius), 3));
    }
#endif
#if LAB_CHECKPOINT >= 7
    if ((uPrimitiveMask & 8) != 0) {
        sample = nearer(sample, SceneSample(sdBox(point, vec3(0.0, -1.12, 0.0), vec3(3.6, 0.12, 3.2)), 4));
        sample = nearer(sample, SceneSample(sdBox(point, vec3(0.0, 0.6, -3.2), vec3(3.6, 1.6, 0.1)), 4));
        sample = nearer(sample, SceneSample(sdBox(point, vec3(-3.6, 0.6, 0.0), vec3(0.1, 1.6, 3.2)), 4));
        sample = nearer(sample, SceneSample(sdBox(point, vec3(3.6, 0.6, 0.0), vec3(0.1, 1.6, 3.2)), 4));
        sample = nearer(sample, SceneSample(sdBox(point, vec3(0.0, 2.3, 0.0), vec3(3.6, 0.1, 3.2)), 4));
    }
#endif
    return sample;
}
#endif

#if LAB_CHECKPOINT >= 4
struct MarchResult {
    bool hit;
    float traveled;
    int steps;
    int materialId;
    vec3 position;
    int status;
};

// Status values match MarchStatus in the CPU reference.
// [snippet:gpu-march]
MarchResult marchRay(vec3 origin, vec3 direction) {
    MarchResult result = MarchResult(false, 0.0, 0, 0, origin, 3);
    if (invalidNumber(uSphereRadius) || uSphereRadius < 0.4 || uSphereRadius > 1.1) {
        return result;
    }
#if LAB_CHECKPOINT >= 5
    if (invalidNumber(uNormalEpsilon) || uNormalEpsilon < 0.00001 || uNormalEpsilon > 0.02) {
        return result;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (invalidNumber(uTorusMinorRadius) || uTorusMinorRadius < 0.12 || uTorusMinorRadius > 0.32) {
        return result;
    }
#endif
    if (invalidPosition(origin) || invalidPosition(direction) || abs(length(direction) - 1.0) > 0.00001 ||
        uMaximumSteps < 1 || uMaximumSteps > 256 || invalidNumber(uHitEpsilon) || uHitEpsilon < 0.00001 ||
        uHitEpsilon > 0.02 || invalidNumber(uMaximumDistance) || uMaximumDistance < 0.1 || uMaximumDistance > 80.0) {
        return result;
    }
    for (int step = 0; step < 256; ++step) {
        if (step >= uMaximumSteps) {
            break;
        }
        result.position = origin + direction * result.traveled;
        SceneSample sample = sampleScene(result.position);
        result.steps = step + 1;
        if (invalidPosition(result.position) || invalidNumber(sample.distance)) {
            result.status = 4;
            return result;
        }
        if (sample.materialId == 0) {
            result.status = 6;
            return result;
        }
        float distanceToSurface = abs(sample.distance);
        if (distanceToSurface <= uHitEpsilon) {
            result.hit = true;
            result.materialId = sample.materialId;
            result.status = 0;
            return result;
        }
        float next = result.traveled + distanceToSurface;
        if (invalidNumber(next) || next <= result.traveled) {
            result.status = 5;
            return result;
        }
        if (next > uMaximumDistance || result.traveled == uMaximumDistance) {
            result.traveled = uMaximumDistance;
            result.position = origin + direction * result.traveled;
            result.status = 1;
            return result;
        }
        result.traveled = next;
    }
    result.position = origin + direction * result.traveled;
    result.status = 2;
    return result;
}
// [/snippet:gpu-march]
#endif

#if LAB_CHECKPOINT >= 5
// [snippet:gpu-normal]
vec3 estimateNormal(vec3 point) {
    vec3 dx = vec3(uNormalEpsilon, 0.0, 0.0);
    vec3 dy = vec3(0.0, uNormalEpsilon, 0.0);
    vec3 dz = vec3(0.0, 0.0, uNormalEpsilon);
    vec3 gradient = vec3(
        sampleScene(point + dx).distance - sampleScene(point - dx).distance,
        sampleScene(point + dy).distance - sampleScene(point - dy).distance,
        sampleScene(point + dz).distance - sampleScene(point - dz).distance
    );
    float magnitude = length(gradient);
    if (invalidNumber(magnitude) || magnitude < 0.0000001) {
        return vec3(0.0);
    }
    return gradient / magnitude;
}
// [/snippet:gpu-normal]

vec3 materialColor(int id, vec3 point, vec3 normal) {
    if (id == 1) {
        return vec3(0.08, 0.40, 0.70);
    }
    if (id == 2) {
        return vec3(0.82, 0.27, 0.08);
    }
    if (id == 3) {
        return vec3(0.48, 0.16, 0.68);
    }
    if (normal.y > 0.5) {
        float checker = mod(floor(point.x * 1.5) + floor(point.z * 1.5), 2.0);
        return mix(vec3(0.16, 0.20, 0.25), vec3(0.28, 0.33, 0.39), checker);
    }
    return mix(vec3(0.36, 0.41, 0.48), vec3(0.48, 0.38, 0.29), smoothstep(-1.0, 1.0, normal.x));
}
#endif

#if LAB_CHECKPOINT >= 8
// [snippet:gpu-shadow]
float softShadow(vec3 origin, vec3 direction, float lightDistance) {
    float visibility = 1.0;
    float traveled = 0.004;
    for (int step = 0; step < 64; ++step) {
        if (traveled >= lightDistance) {
            return clamp(visibility, 0.0, 1.0);
        }
        float distance = sampleScene(origin + direction * traveled).distance;
        if (invalidNumber(distance) || distance <= 0.001) {
            return 0.0;
        }
        visibility = min(visibility, 14.0 * distance / traveled);
        traveled += clamp(distance, 0.004, 0.4);
    }
    return 0.0;
}
// [/snippet:gpu-shadow]
#endif

void main() {
#if LAB_CHECKPOINT >= 4
    vec3 rayDirection = makeCameraRay(gl_FragCoord.xy);
    MarchResult result = marchRay(uCameraPosition, rayDirection);
#if LAB_CHECKPOINT >= 10
    if (uDebugView == 1) {
        float ratio = float(result.steps) / float(uMaximumSteps);
        fragColor = vec4(mix(vec3(0.05, 0.16, 0.50), vec3(1.0, 0.30, 0.06), clamp(ratio, 0.0, 1.0)), 1.0);
        return;
    }
    if (uDebugView == 2) {
        float value = 0.0;
        if (result.hit) {
            value = 1.0;
        }
        fragColor = vec4(vec3(value), 1.0);
        return;
    }
#endif
    vec3 sky = mix(vec3(0.025, 0.04, 0.065), vec3(0.14, 0.20, 0.29), rayDirection.y * 0.5 + 0.5);
    if (!result.hit) {
        if (result.status == 3 || result.status == 4 || result.status == 5) {
            sky = vec3(0.8, 0.0, 0.55);
        }
        fragColor = vec4(pow(sky, vec3(1.0 / 2.2)), 1.0);
        return;
    }
#if LAB_CHECKPOINT >= 5
    vec3 geometricNormal = estimateNormal(result.position);
    if (dot(geometricNormal, geometricNormal) < 0.5) {
        fragColor = vec4(1.0, 0.0, 0.65, 1.0);
        return;
    }
#if LAB_CHECKPOINT >= 10
    if (uDebugView == 3) {
        fragColor = vec4(geometricNormal * 0.5 + 0.5, 1.0);
        return;
    }
#endif
    vec3 normal = geometricNormal;
    if (dot(normal, rayDirection) > 0.0) {
        normal = -normal;
    }
    vec3 light = vec3(-1.2, 1.7, 1.9);
#if LAB_CHECKPOINT >= 8
    light = vec3(-1.2 + 1.8 * sin(uTime * 0.35), 1.7, 1.5 + 0.4 * cos(uTime * 0.35));
#endif
    vec3 toLight = light - result.position;
    float lightDistance = length(toLight);
    vec3 lightDirection = toLight / max(lightDistance, 0.0001);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float visibility = 1.0;
#if LAB_CHECKPOINT >= 8
    visibility = softShadow(result.position + normal * (uHitEpsilon * 3.0), lightDirection, lightDistance);
#endif
    vec3 baseColor = materialColor(result.materialId, result.position, normal);
    vec3 halfDirection = normalize(lightDirection - rayDirection);
    float specular = 0.22 * pow(max(dot(normal, halfDirection), 0.0), 48.0);
    float attenuation = 2.4 / (1.0 + 0.025 * lightDistance * lightDistance);
    vec3 color = baseColor * (0.22 + attenuation * diffuse * visibility) + vec3(specular * visibility);
    // Haze depends on world distance, never on the cost of the march.
    float haze = 1.0 - exp(-0.006 * result.traveled * result.traveled);
    color = mix(color, sky, haze);
    fragColor = vec4(pow(max(color, vec3(0.0)), vec3(1.0 / 2.2)), 1.0);
#else
    fragColor = vec4(0.16, 0.58, 0.92, 1.0);
#endif
#elif LAB_CHECKPOINT >= 3
    vec2 centered = (2.0 * gl_FragCoord.xy - uResolution) / uResolution.y;
    vec3 point = vec3(centered * 1.7 + vec2(-1.0, -0.18), 0.15);
    float distance = sdSphere(point, vec3(-1.0, -0.18, 0.15), uSphereRadius);
    vec3 signColor = vec3(0.12, 0.42, 0.80);
    if (distance < 0.0) {
        signColor = vec3(0.85, 0.22, 0.12);
    }
    float boundary = exp(-abs(distance) * 80.0);
    fragColor = vec4(mix(signColor, vec3(1.0), boundary), 1.0);
#elif LAB_CHECKPOINT >= 2
    vec3 direction = makeCameraRay(gl_FragCoord.xy);
    fragColor = vec4(direction * 0.5 + 0.5, 1.0);
#elif LAB_CHECKPOINT >= 1
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 grid = abs(fract(gl_FragCoord.xy / 32.0) - 0.5);
    float line = smoothstep(0.44, 0.49, max(grid.x, grid.y));
    fragColor = vec4(mix(vec3(uv, 0.22), vec3(0.82), line * 0.4), 1.0);
#else
    fragColor = vec4(0.025, 0.055, 0.10, 1.0);
#endif
}
