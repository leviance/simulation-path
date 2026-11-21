#include "room_mesh.hpp"
#include "shader_files.hpp"
#include <iostream>

namespace {
using namespace lab;
int errors{};
void check(bool ok, const char* why) { if (!ok) { std::cerr << why << '\n'; ++errors; } }
bool close(float a, float b) { return std::abs(a-b) < 0.0001F; }

// Đối chứng độc lập: cắt tia với các hộp đã xoay, không đọc lại thuật toán shadow map.
bool intersects(const Piece& box, Vec3 origin, Vec3 ray) {
    const auto& m = box.model.m;
    const Vec3 offset = sub(origin, {m[12],m[13],m[14]});
    float entry = 0.002F, exit = 100.0F;
    for (int col=0; col<3; ++col) {
        const Vec3 axis{m[4*col], m[4*col+1], m[4*col+2]};
        const float o = dot(offset,axis) / dot(axis,axis);
        const float v = dot(ray,axis) / dot(axis,axis);
        if (std::abs(v) < 0.000001F) {
            if (std::abs(o) > 0.5F) return false;
            continue;
        }
        float a = (-0.5F-o)/v, b = (0.5F-o)/v;
        if (a > b) std::swap(a,b);
        entry = std::max(entry,a); exit = std::min(exit,b);
        if (entry > exit) return false;
    }
    return true;
}
bool blocked(const ShutterState& s, Vec3 p) {
    for (const auto& box : makeRoom(s)) {
        if (intersects(box,p,sunDirection(s))) return true;
    }
    return false;
}
}
int main() {
    ShutterState s;
    const auto mesh = unitBox();
    for (int i = 0; i < 36; i += 3) {
        const auto a = mesh.vertices.at(mesh.indices[i]), b = mesh.vertices.at(mesh.indices[i+1]), c = mesh.vertices.at(mesh.indices[i+2]);
        check(dot(cross(sub(b.position,a.position),sub(c.position,a.position)),a.normal) > 0, "box winding and normal disagree");
    }
    const Vec3 blade{-0.8F,0.002F,2.54141F}, gap{-0.8F,0.002F,2.73160F}, cube{1.03F,0.002F,2.73160F};
    check(blocked(s,blade) && !blocked(s,gap), "same normal does not imply same visibility");
    check(blocked(s,cube), "crate did not block the selected point");
    s.boxX=-1.4F; check(!blocked(s,cube), "moving the crate should free that point");
    auto samples = [&](float angle) {
        s.angle=angle; int lit=0;
        for (int i=0;i<=100;++i) if (!blocked(s,{-0.4F,0.002F,1.6F+0.015F*float(i)})) ++lit;
        return lit;
    };
    const int opened=samples(42), tilted=samples(23), shut=samples(-38);
    check(opened>tilted && tilted>shut && shut<5, "slat positions or tilt conventions changed");
    const auto light=lightVP(s).m, camera=cameraVP(s,1.5F).m;
    s.yaw -= 18;
    check(lightVP(s).m == light && cameraVP(s,1.5F).m != camera, "light view must not depend on camera");
    const auto sun=sunDirection(s);
    check(close(dot(sun,sun),1) && sun.z<0 && sun.y>0, "sun direction must point outside and up");
    s.sun+=8; check(lightVP(s).m!=light, "changing direction must rebuild light matrix");
    const auto far=transformPoint(lightVP(s),{100,0,100});
    check(std::abs(far.x)>1 || std::abs(far.y)>1, "out-of-map fixture");
    ShaderWatchState watch{}; ShaderFileStamps files{};
    check(!updateShaderWatch(watch,files,100),"initial state is not a write");
    files.fragment.size=42; check(!updateShaderWatch(watch,files,120),"do not reload mid-write");
    check(!updateShaderWatch(watch,files,210) && updateShaderWatch(watch,files,270) && !updateShaderWatch(watch,files,500),"one attempt per write");
    return std::min(errors,1);
}
