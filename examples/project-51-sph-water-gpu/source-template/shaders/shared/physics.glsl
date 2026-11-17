uniform uint particleCount;
uniform uint cellCount;
uniform int latticeSide;
uniform ivec3 gridSize;
uniform float spacing;
uniform float smoothingLength;
uniform float particleMass;
uniform float soundSpeed;
uniform float viscosityAlpha;
uniform float gravity;
uniform bool useGrid;
const vec3 tankSize = vec3(1.65, 0.825, 1.1);
const float rho0 = 1000.0;
const float pi = 3.14159265358979323846;

// [snippet spline3]
float kernel3(float r) {
    float q = r / smoothingLength;
    if (q >= 2.0)
        return 0.0;
    float normalization = 1.0 / (pi * smoothingLength * smoothingLength * smoothingLength);
    if (q < 1.0)
        return normalization * (1.0 - 1.5 * q * q + 0.75 * q * q * q);
    return normalization * 0.25 * pow(2.0 - q, 3.0);
}

vec3 gradient3(vec3 displacement) {
    float r = length(displacement);
    if (r < 1e-12 || r >= 2.0 * smoothingLength)
        return vec3(0.0);
    float q = r / smoothingLength;
    float derivative = -0.75 * (2.0 - q) * (2.0 - q);
    if (q < 1.0)
        derivative = -3.0 * q + 2.25 * q * q;
    return displacement * (derivative / (pi * pow(smoothingLength, 4.0) * r));
}

// [/snippet spline3]
float artificialViscosity(vec3 displacement, vec3 relativeVelocity, float rhoi, float rhoj) {
    float approach = dot(relativeVelocity, displacement);
    if (approach >= 0.0)
        return 0.0;
    float mu = smoothingLength * approach / (dot(displacement, displacement) + 0.01 * smoothingLength * smoothingLength);
    return -viscosityAlpha * soundSpeed * mu / (0.5 * (rhoi + rhoj));
}

bool finite3(vec3 value) {
    return !any(isnan(value)) && !any(isinf(value));
}

uint cellIndex(vec3 point) {
    ivec3 c = clamp(ivec3(floor(point / (2.0 * smoothingLength))), ivec3(0), gridSize - 1);
    return uint(c.x + gridSize.x * (c.y + gridSize.y * c.z));
}

bool validCell(ivec3 cell) {
    return all(greaterThanEqual(cell, ivec3(0))) && all(lessThan(cell, gridSize));
}

uint cellId(ivec3 c) {
    return uint(c.x + gridSize.x * (c.y + gridSize.y * c.z));
}

bool nearBoundary(vec3 point) {
    float radius = 2.0 * smoothingLength;
    return any(lessThan(point, vec3(radius))) || any(greaterThan(point, tankSize - vec3(radius))) || (body.w > 0.0 && length(point - body.xyz) < body.w + radius);
}

bool boundaryNode(ivec3 node, out vec3 velocity) {
    ivec3 limits = ivec3(3 * latticeSide, 3 * latticeSide / 2, 2 * latticeSide);
    bool outside = any(lessThan(node, ivec3(0))) || any(greaterThanEqual(node, limits));
    vec3 point = (vec3(node) + 0.5) * spacing;
    bool inBody = body.w > 0.0 && length(point - body.xyz) < body.w;
    velocity = vec3(0.0);
    if (inBody && !outside)
        velocity = bodyVelocity.xyz;
    return outside || inBody;
}
