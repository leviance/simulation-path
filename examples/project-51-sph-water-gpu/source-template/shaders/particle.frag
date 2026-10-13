#version 430 core
in vec3 color;
out vec4 fragment;
void main() { if(length(gl_PointCoord-0.5)>0.5) discard; fragment=vec4(color,1.0); }
