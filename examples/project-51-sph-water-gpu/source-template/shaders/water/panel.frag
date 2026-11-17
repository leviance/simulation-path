#version 430 core
uniform sampler2D image;
uniform vec2 viewport;
uniform float originX;
layout(location = 0) out vec4 result;

void main() {
    vec2 uv = (gl_FragCoord.xy - vec2(originX, 0)) / viewport;
    result = texture(image, vec2(uv.x, 1.0 - uv.y));
}
