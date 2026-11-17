#version 430 core
// [snippet surface-source]
uniform sampler2D source;
uniform sampler2D rawThickness;
uniform bool packedSource;
uniform int stepScale;
uniform float spacing;
uniform float focal;
layout(location = 0) out vec2 result;

vec2 surfaceAt(ivec2 pixel) {
    vec2 value = texelFetch(source, pixel, 0).rg;
    if (!packedSource)
        value.y = texelFetch(rawThickness, pixel, 0).r;
    return value;
}
// [/snippet surface-source]

void main() {
    ivec2 pixel = ivec2(gl_FragCoord.xy);
    ivec2 size = textureSize(source, 0);
    vec2 centre = surfaceAt(pixel);
    result = centre;
    if (centre.x == 0.0)
        return;
#if LAB_CHECKPOINT >= 9
    // [snippet bilateral]
    // Three small 2D stencils remove particle-scale bumps without a large square blur.
    int footprint = int(clamp(ceil(.20 * spacing * focal / centre.x), 1.0, 3.0));
    int stepPixels = footprint * stepScale;
    float sigma = 2.0 * spacing;
    vec2 sum = vec2(0);
    float weights = 0.0;
    for (int y = -1; y <= 1; ++y) {
        for (int x = -1; x <= 1; ++x) {
            ivec2 q = clamp(pixel + ivec2(x, y) * stepPixels, ivec2(0), size - 1);
            vec2 sampleValue = surfaceAt(q);
            if (sampleValue.x == 0.0)
                continue;
            float spatial = 1.0;
            if (x == 0)
                spatial *= 2.0;
            if (y == 0)
                spatial *= 2.0;
            float difference = (sampleValue.x - centre.x) / sigma;
            float weight = spatial * exp(-.5 * difference * difference);
            sum += weight * sampleValue;
            weights += weight;
        }
    }
    result = sum / weights;
    // [/snippet bilateral]
#endif
}
