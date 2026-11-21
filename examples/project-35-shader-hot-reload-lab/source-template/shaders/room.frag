#version 330 core

in vec3 vWorld;
in vec3 vNormal;
in vec3 vLocal;
out vec4 fragColor;

uniform vec3 uColor;
uniform int uMaterial;
#if LAB_CHECKPOINT >= 2
uniform vec3 uSun;
#endif
#if LAB_CHECKPOINT >= 4
in vec4 vLightClip;
uniform sampler2D uShadow;
uniform int uShadows;
#endif
#if LAB_CHECKPOINT >= 5
uniform float uBias;
uniform int uFilter;
#endif
#if LAB_CHECKPOINT >= 7
uniform int uMode;
#endif

float boardSeed(vec2 board) {
    vec3 p = fract(vec3(board.xyx) * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
}

float fineGrain(float phase) {
    // Khi một thớ gỗ nhỏ hơn một pixel, giảm tương phản để vân không nhấp nháy.
    return sin(phase) * (1.0 - smoothstep(0.55, 2.9, fwidth(phase)));
}

float limeNoise(vec2 point) {
    vec2 tile = floor(point);
    vec2 t = fract(point);
    t = t * t * (3.0 - 2.0 * t);
    float bottom = mix(boardSeed(tile), boardSeed(tile + vec2(1, 0)), t.x);
    float top = mix(boardSeed(tile + vec2(0, 1)), boardSeed(tile + vec2(1, 1)), t.x);
    return mix(bottom, top, t.y);
}

vec3 limePlaster(vec3 base, vec3 world) {
    // Tọa độ thế giới nối liền lớp vôi qua cả bốn mảng tường quanh ô cửa.
    vec2 face = vec2(world.x + 0.81 * world.z, world.y);
    float wash = limeNoise(1.55 * face) - 0.5;
    float stucco = limeNoise(17.0 * face + vec2(3, 11)) - 0.5;
    return base * (1.0 + 0.045 * wash + 0.023 * stucco);
}

vec3 oakFloor(vec3 base, vec2 meters) {
    float across = meters.y / 0.36;
    float row = floor(across);
    float stagger = boardSeed(vec2(row, 4.0));
    float along = meters.x / 2.85 + stagger;
    float seed = boardSeed(vec2(floor(along), row));
    float warp = sin(meters.x * 1.7 + seed * 8.0) + 0.28 * sin(meters.x * 3.9 + row);
    float grain = fineGrain(across * 13.5 + 2.8 * warp) + 0.48 * fineGrain(across * 61.0 + 3.9 * warp);

    vec2 cell = fract(vec2(along, across));
    vec2 edge = min(cell, 1.0 - cell) * vec2(2.85, 0.36);
    float joint = min(edge.x, edge.y);
    float pixelWidth = max(fwidth(meters.x), fwidth(meters.y));
    float seam = 1.0 - smoothstep(0.001, 0.005 + 0.45 * pixelWidth, joint);
    vec3 oak = mix(base, vec3(0.82, 0.71, 0.54), 0.34);
    return oak * (0.940 + 0.120 * seed + 0.031 * grain - 0.104 * seam);
}

vec3 paintedBox(vec3 base, vec3 local) {
    // Mỗi mặt có hai cạnh nhìn thấy trong hệ tọa độ của chính hộp. Viền sơn
    // đi theo hộp; việc xoay camera hoặc dịch hộp không đổi bề rộng tương đối.
    vec3 p = abs(local);
    float extent = max(p.x, max(p.y, p.z));
    vec2 face = p.xy;
    if (p.x >= extent) face = p.yz;
    else if (p.y >= extent) face = p.xz;
    float inset = 1.0 - max(face.x, face.y) / max(extent, 0.001);
    float aa = max(fwidth(inset), 0.003);
    float fineLine = 1.0 - smoothstep(0.004, 0.010 + aa, abs(inset - 0.105));
    float rim = 1.0 - smoothstep(0.010, 0.031 + aa, inset);
    float fibre = fineGrain(81.0 * (local.x + local.z) + 1.3 * sin(7.0 * local.y));
    vec3 paint = mix(base, vec3(0.77, 0.80, 0.70), 0.25) * (1.0 + 0.013 * fibre);
    paint = mix(paint, paint * vec3(0.84, 0.88, 0.83), rim);
    return mix(paint, vec3(0.79, 0.73, 0.53), 0.46 * fineLine);
}

// [snippet surface-color]
vec3 surfaceColor() {
    if (uMaterial == 0) return limePlaster(uColor, vWorld);
    if (uMaterial == 1) return oakFloor(uColor, vWorld.xz);
    if (uMaterial == 2) {
        float grain = fineGrain(53.0 * vLocal.y + 29.0 * vLocal.z + 1.4 * sin(8.0 * vLocal.x));
        return mix(uColor, vec3(0.52, 0.39, 0.28), 0.18) * (1.0 + 0.033 * grain);
    }
    if (uMaterial == 3) return paintedBox(uColor, vLocal);
    if (uMaterial == 4) return mix(uColor, vec3(0.86, 0.72, 0.46), 0.58);
    return uColor;
}
// [/snippet surface-color]

#if LAB_CHECKPOINT >= 4
// [snippet compare-depth]
float compareDepth(ivec2 pixel, ivec2 mapSize, float receiverDepth, float bias) {
    if (any(lessThan(pixel, ivec2(0))) || any(greaterThanEqual(pixel, mapSize))) return 1.0;
    float blockerDepth = texelFetch(uShadow, pixel, 0).r;
    if (receiverDepth - bias <= blockerDepth) return 1.0;
    return 0.0;
}
// [/snippet compare-depth]
#endif

#if LAB_CHECKPOINT >= 5
// [snippet filter-shadow]
float filteredVisibility(ivec2 pixel, ivec2 mapSize, float receiverDepth, float bias) {
    float litSamples = 0.0;
    for (int y = -1; y <= 1; ++y) {
        for (int x = -1; x <= 1; ++x) {
            litSamples += compareDepth(pixel + ivec2(x, y), mapSize, receiverDepth, bias);
        }
    }
    return litSamples / 9.0;
}
// [/snippet filter-shadow]
#endif

#if LAB_CHECKPOINT >= 4
float shadowVisibility(float lambert) {
    if (uShadows == 0 || vLightClip.w <= 0.0) return 1.0;
    // Phép chia phối cảnh cho tọa độ [-1, 1]; texture lại dùng [0, 1].
    // [snippet light-uv]
    vec3 point = 0.5 * (vLightClip.xyz / vLightClip.w) + 0.5;
    if (any(lessThan(point, vec3(0.0))) || any(greaterThanEqual(point, vec3(1.0)))) return 1.0;
    ivec2 mapSize = textureSize(uShadow, 0);
    ivec2 pixel = ivec2(floor(point.xy * vec2(mapSize)));
    // [/snippet light-uv]
    float bias = 0.0008;
#if LAB_CHECKPOINT >= 5
    // [snippet slope-bias]
    bias = clamp(uBias * (1.0 + 2.0 * (1.0 - lambert)), 0.0, 0.02);
    if (uFilter != 0) return filteredVisibility(pixel, mapSize, point.z, bias);
    // [/snippet slope-bias]
#endif
    return compareDepth(pixel, mapSize, point.z, bias);
}
#endif

vec3 displayColor(vec3 base, vec3 normal, float lambert, float visibility) {
    // Pha ánh sáng trong không gian tuyến tính. Bóng chỉ chặn luồng nắng
    // trực tiếp; phần ánh sáng nền vẫn cho ta thấy thớ gỗ dưới bóng râm.
    // Màu trời và ánh hắt từ phòng là thành phần nền rộng, không tạo sọc
    // hoặc bóng. Mặt hộp quay về các hướng khác nhau vẫn có sắc độ riêng.
    float roomFill = max(dot(normal, normalize(vec3(-0.67, 0.46, 0.70))), 0.0);
    float skyFill = smoothstep(0.0, 4.6, vWorld.y);
    vec3 ambient = vec3(0.385, 0.430, 0.490) + vec3(0.505, 0.455, 0.355) * roomFill;
    ambient += vec3(0.055, 0.070, 0.090) * max(normal.y, 0.0);
    ambient += mix(vec3(0.042, 0.023, 0.010), vec3(0.082, 0.100, 0.116), skyFill);
    vec3 afternoon = vec3(1.68, 1.50, 1.27);
    vec3 linear = pow(max(base, vec3(0.0)), vec3(2.2)) * (ambient + afternoon * lambert * visibility);
    float peak = max(linear.r, max(linear.g, linear.b));
    if (peak > 0.82) {
        float excess = peak - 0.82;
        linear *= (0.82 + 0.18 * excess / (0.18 + excess)) / peak;
    }
    return pow(linear, vec3(1.0 / 2.2));
}

#if LAB_CHECKPOINT >= 7
// [snippet shadow-layer]
vec3 inspectionLayer(vec3 beauty, float visibility, float lambert) {
    if (uMode == 1) return vec3(visibility);
    if (uMode == 2) return vec3(lambert);
    return beauty;
}
// [/snippet shadow-layer]
#endif

void main() {
    vec3 normal = normalize(vNormal);
    vec3 base = surfaceColor();
    float lambert = 0.5;
#if LAB_CHECKPOINT >= 1
    vec3 sun = normalize(vec3(-0.70, 0.58, -0.40));
#if LAB_CHECKPOINT >= 2
    sun = normalize(uSun);
#endif
    lambert = max(dot(normal, sun), 0.0);
#endif
    float visibility = 1.0;
#if LAB_CHECKPOINT >= 4
    visibility = shadowVisibility(lambert);
#endif
    vec3 color = displayColor(base, normal, lambert, visibility);
#if LAB_CHECKPOINT >= 7
    color = inspectionLayer(color, visibility, lambert);
#endif
    fragColor = vec4(color, 1.0);
}
