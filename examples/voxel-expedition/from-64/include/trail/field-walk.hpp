#pragma once
#include "field-scene.hpp"
#include <SDL3/SDL.h>
#include <iostream>

namespace trail {
#if LAB_CHECKPOINT >= 6405
// Tuyến lặp lại được qua đúng hàm di chuyển và vòng lặp SDL của người chơi.
// Một lượt tự động không thay ý kiến người thật về cảm giác đi bộ.
struct RecordedWalk {
    int waypoint = 0, laps = 0, band = -1, sample = -1;
    double walked = 0, peakRenderMs = 0;
    double minZ = 10000, maxZ = -10000;
    std::array<bool, 5> visited{};

    void steer(Scene& scene, double dt, double wall) {
        constexpr std::array<int, 9> stops{-7, 4, 39, 96, 147, 170, 184, 147, 4};
        const double nextZ = stops[waypoint] + 0.5;
        const double dz = nextZ - scene.camera.eye.z;
        const double targetX = pathX(scene.camera.eye.z, scene.region.seed);
        const double dx = targetX - scene.camera.eye.x;
        if (std::abs(dz) < 0.90 && std::abs(dx) < 1.25) {
            if (waypoint == 0)
                visited[0] = true;
            if (waypoint == 2)
                visited[1] = true;
            if (waypoint == 3)
                visited[2] = true;
            if (waypoint == 4)
                visited[4] = true;
            if (waypoint == 5)
                visited[3] = true;
            ++waypoint;
            if (waypoint == int(stops.size())) {
                waypoint = 0;
                ++laps;
            }
        }
        const int nowBand = int(wall / 24);
        if (band != nowBand) {
            band = nowBand;
            constexpr std::array<SDL_Keycode, 8> actions{SDLK_F1, SDLK_P, SDLK_G, SDLK_P, SDLK_C, SDLK_EQUALS, SDLK_C, SDLK_T};
            SDL_Event event{};
            event.type = SDL_EVENT_KEY_DOWN;
            event.key.key = actions[band % actions.size()];
            event.key.down = true;
            SDL_PushEvent(&event);
        }
        const Vec3 old = scene.camera.eye;
        scene.camera.yaw = std::atan2(dx, std::clamp(dz, -1.6, 1.6));
        scene.camera.pitch = -0.09 + 0.13 * std::sin(wall * 0.12);
        if (std::fmod(wall, 11) > 2)
            travel(scene, 1, 0, 0, dt);
        else
            scene.camera.yaw += 0.55 * std::sin(wall);
        const Vec3 delta = scene.camera.eye - old;
        walked += std::hypot(delta.x, delta.z);
        minZ = std::min(minZ, scene.camera.eye.z);
        maxZ = std::max(maxZ, scene.camera.eye.z);
    }

    void record(const Scene& s, double wall, double updateMs, double drawMs, double uploadMs) {
        // [snippet field-sampling]
        peakRenderMs = std::max(peakRenderMs, drawMs);
        const int mark = int(wall / 15);
        if (mark == sample)
            return;
        sample = mark;
        // [/snippet field-sampling]
        std::cout << "WALK t=" << int(wall) << " z=" << s.camera.eye.z << " x=" << s.camera.eye.x << " y=" << s.camera.eye.y << " moved=" << walked;
        std::cout << " next=" << waypoint << " laps=" << laps << " resident=" << s.region.tiles.size() << " queue=" << s.stream.wanted.size();
        std::cout << " dirty=" << s.region.dirty.size() << " flakes=" << std::count_if(s.snow.pool.begin(), s.snow.pool.end(), [](const auto& f) { return f.alive; });
        std::cout << " generation_ms=" << s.region.lastLoadMs << " mesh_ms=" << s.region.lastBuildMs << " update_ms=" << updateMs;
        std::cout << " draw_ms=" << drawMs << " upload_ms=" << uploadMs << " peak_draw_ms=" << peakRenderMs << std::endl;
    }
};
#endif
} // namespace trail
