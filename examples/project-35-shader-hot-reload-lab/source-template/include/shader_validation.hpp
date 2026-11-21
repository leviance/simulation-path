#pragma once
#include "room_drawing.hpp"
#include "shader_input.hpp"
#include <iostream>
#if LAB_CHECKPOINT >= 7
namespace lab {
struct DepthReadout { float receiver{}, nearest{}; bool inside{}; };
inline DepthReadout readDepthAt(GlApi& gl, const ShadowTarget& map, const Mat4& view, Vec3 p) {
    const Vec3 ndc = transformPoint(view, p);
    if (std::abs(ndc.x) >= 1 || std::abs(ndc.y) >= 1 || std::abs(ndc.z) >= 1) return {};
    const int x = int((0.5F + 0.5F * ndc.x) * map.side);
    const int y = int((0.5F + 0.5F * ndc.y) * map.side);
    float nearest = 1;
    gl.BindFramebuffer(GL_FRAMEBUFFER, map.fbo);
    gl.ReadPixels(x, y, 1, 1, GL_DEPTH_COMPONENT, GL_FLOAT, &nearest);
    gl.BindFramebuffer(GL_FRAMEBUFFER, 0);
    return {0.5F + 0.5F * ndc.z, nearest, true};
}
// --verify dùng chính texture và back buffer native; không thay chúng bằng ray test CPU.
inline bool verifyShutter(GlApi& gl, RoomDrawing& drawing, const std::filesystem::path& directory, int w, int h) {
    bool ok = true;
    auto check = [&](bool value, const char* label) {
        std::cout << label << ": " << value << '\n';
        if (!value) ok = false;
    };
    ShutterState s;
    auto frame = [&] { drawing.draw(gl, s, w, h); };
    auto lit = [&](Vec3 p) {
        const auto d = readDepthAt(gl, drawing.shadow, lightVP(s), p);
        if (!d.inside) return true;
        return d.receiver - 0.0018F <= d.nearest;
    };
    auto pixel = [&](Vec3 p) {
        const auto image = transformPoint(cameraVP(s, float(w) / float(h)), p);
        std::array<unsigned char, 4> color{};
        gl.ReadPixels(int((0.5F + 0.5F * image.x) * w), int((0.5F + 0.5F * image.y) * h),
                      1, 1, GL_RGBA, GL_UNSIGNED_BYTE, color.data());
        return color;
    };
    const Vec3 blade{-0.8F,0.002F,2.54141F}, gap{-0.8F,0.002F,2.73160F}, crate{1.03F,0.002F,2.73160F};
    // [snippet floor-probes]
    frame();
    check(!lit(blade) && lit(gap), "one floor normal, two different depth comparisons");
    check(!lit(crate), "crate blocks its world-space probe");
    s.boxX = -1.4F;
    frame();
    check(lit(crate), "moving the crate uncovers its old shadow");
    // [/snippet floor-probes]
    s = {};
    s.mode = 2;
    s.filtering = false;
    frame();
    const auto shadowPixel = pixel(blade);
    const auto sunPixel = pixel(gap);
    std::cout << "visibility mask (shade, sun): " << int(shadowPixel[0]) << ", " << int(sunPixel[0]) << '\n';
    check(shadowPixel[0] < 25 && sunPixel[0] > 225, "real camera fragment sees a stripe and a gap");
    s.shadows = false; frame();
    check(pixel(blade)[0] > 225, "bypassing comparison removes floor stripe, not geometry");
    s.shadows = true;
    s.yaw -= 20; frame();
    check(pixel(blade)[0] < 25 && lit(gap), "orbit does not drag the shadow");
    check(!readDepthAt(gl,drawing.shadow,lightVP(s),{100,0,100}).inside, "outside map is not sampled");
    auto count = [&](float angle) {
        s.angle = angle; s.boxX = -1.4F; frame();
        int seen = 0;
        for (int i = 0; i <= 200; ++i) {
            if (lit({-0.4F,0.002F,1.60F + 1.50F * float(i) / 200.0F})) ++seen;
        }
        return seen;
    };
    const int open = count(42), closed = count(-38);
    std::cout << "sunlit floor probes of 201: open=" << open << " closed=" << closed << '\n';
    check(open > 100 && closed < 15, "closing eight real slats reduces sunlit area");
    s = {}; frame();
    const auto original = pixel(blade);
    ShaderSources good; std::string log;
    if (!readShaderFiles(directory, good, log)) return false;
    const auto previous = drawing.material.active;
    const auto generation = drawing.material.reload.generation;
    auto reject = [&](const ShaderSources& candidate, std::string_view kind) {
        const bool failed = !drawing.material.replace(gl, candidate);
        frame();
        check(failed && drawing.material.active == previous && drawing.material.reload.generation == generation &&
            drawing.material.reload.diagnostics.find(kind) != std::string::npos && pixel(blade) == original,
            "failed shader reports the stage and keeps the last-good image");
    };
    auto candidate = good; candidate.fragment += "\ninvalid shader tokens;\n"; reject(candidate, "fragment");
    candidate.fragment = "#version 330 core\nin vec2 vWorld; out vec4 c; void main(){c=vec4(vWorld,0,1);}";
    reject(candidate, "link");
    candidate.fragment = "#version 330 core\nuniform vec2 uColor; out vec4 c; void main(){c=vec4(uColor,0,1);}";
    reject(candidate, "uColor");
    check(drawing.material.replace(gl, good) && drawing.material.reload.generation == generation + 1 && !gl.IsProgram(previous),
        "corrected shader replaces the old program");
    frame(); check(pixel(blade) == original, "successful reload preserves scene");
    int dir = -1;
    SDL_Event event{}; PointerDrag drag{};
    event.type = SDL_EVENT_KEY_DOWN; event.key.key = SDLK_D;
    const float oldX = s.boxX;
    handleRoomEvent(s, drag, event, w, h, dir);
    check(s.boxX > oldX && s.angle == 23, "SDL D moves only the crate");
    return ok && gl.GetError() == GL_NO_ERROR;
}
} // namespace lab
#endif
