#version 430 core
uniform sampler2D source;
uniform vec2 direction;
uniform float sigma;
layout(location = 0) out float result;

void main() {
    ivec2 pixel = ivec2(gl_FragCoord.xy);
    ivec2 size = textureSize(source, 0);
    float centre = texelFetch(source, pixel, 0).r;
    if (centre == 0.0) {
        result = 0.0;
        return;
    }
    // [snippet bilateral]
    float sum = 0.0, weights = 0.0;
    for (int d = -6; d <= 6; d++) {
        ivec2 q = clamp(pixel + ivec2(direction * float(d)), ivec2(0), size - 1);
        float sampleDepth = texelFetch(source, q, 0).r;
        if (sampleDepth == 0.0)
            continue;
        float difference = (sampleDepth - centre) / sigma;
        float weight = exp(-float(d * d) / 18.0 - .5 * difference * difference);
        sum += weight * sampleDepth;
        weights += weight;
    }
    result = sum / weights;
    // [/snippet bilateral]
}
