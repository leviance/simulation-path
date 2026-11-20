// Record the checkpoint's own framebuffer; there is no web rendering code here.
#include "trail/scene.hpp"
#include <charconv>
#include <cstdio>
#include <string_view>
#ifdef _WIN32
#include <fcntl.h>
#include <io.h>
#endif

int main(int argc, char** argv) {
    if (argc != 3) return 1;
    const std::string_view mark(argv[1]), action(argv[2]);
    int landmark = 0;
    const auto [end, error] = std::from_chars(mark.data(), mark.data() + mark.size(), landmark);
    if (error != std::errc{} || end != mark.data() + mark.size() || landmark < 0 || landmark > 4)
        return 1;
    if (action != "still" && action != "walk") return 1;
#ifdef _WIN32
    if (_setmode(_fileno(stdout), _O_BINARY) == -1) return 1;
#endif

    trail::Scene scene;
    trail::Atlas atlas;
    trail::Frame frame; // Same 800 x 450 resolution as the native SDL texture.
    static_assert(sizeof(trail::Color) == 4);
    scene.landmark = landmark;
    scene.resetPose();
    for (int i = 0; i < 100; ++i) scene.update(0); // Let pending chunk loads finish.
    for (int i = 0; i < 90; ++i) scene.update(1.0 / 30);
#if PROJECT_ID == 64 && STAGE == 4
    scene.startHour = 16;
#endif
    const auto start = scene.camera.eye;
    constexpr double dt = 1.0 / 24;
    for (int i = 0; i < 96; ++i) {
#if PROJECT_ID == 64 && STAGE == 3
        if (action == "walk") {
            const double dx = trail::pathX(scene.camera.eye.z, scene.region.seed) - scene.camera.eye.x;
            scene.camera.yaw = std::atan2(dx, 2.0);
            trail::travel(scene, 1, 0, 0, dt);
        }
#endif
        scene.update(dt);
        scene.draw(frame, atlas);
        if (std::fwrite(frame.pixels.data(), sizeof(trail::Color), frame.pixels.size(), stdout) != frame.pixels.size())
            return 2;
    }
    if (action == "walk" && std::hypot(scene.camera.eye.x - start.x, scene.camera.eye.z - start.z) < 4)
        return 3;
    return std::fflush(stdout) == 0 ? 0 : 2;
}
