#pragma once
#include "fluid/reference.hpp"
#include <chrono>
#include <string>

namespace smoke {
// App giữ lựa chọn của người dùng; Grid chỉ giữ dữ liệu tính toán.
enum class Tool {
    Stir,
    Paint,
    Erase,
    Probe,
};

struct App {
    fluid::Scene scene = fluid::startingScene();
    fluid::Grid grid = fluid::makeScene(fluid::startingResolution(), scene);
    fluid::Parameters parameters;
    fluid::Layer layer = fluid::Layer::Smoke;
    Tool tool = Tool::Paint;
    fluid::Ink ink = fluid::cyan;
    int radius = 2;
    int selectedX = grid.n / 2;
    int selectedY = grid.n / 2;
    bool running = true;
    bool paused = true;
    bool clean = true;
    bool colored = false;
    bool vectors = false;
    bool dragging = false;
    bool moved = false;
    bool secondary = false;
    bool previousValid = false;
    fluid::Vec2 downPoint;
    fluid::Vec2 previous;
    double accumulator = 0;
    double dropped = 0;
    std::size_t updated = 0;
    std::string reference = "NOT RUN";
    std::string error;

    App() {
#if LAB_CHECKPOINT >= 8
        tool = Tool::Stir;
#endif
#if LAB_CHECKPOINT >= 10
        paused = false;
#endif
#if LAB_CHECKPOINT >= 11
        radius = 6;
#endif
#if LAB_CHECKPOINT >= 14
        parameters.method = fluid::PressureMethod::PCG;
#endif
#if LAB_CHECKPOINT == 4
        layer = fluid::Layer::Divergence;
#elif LAB_CHECKPOINT == 5
        grid = fluid::makeScene(8, fluid::Scene::JacobiPair);
        selectedX = 3;
        selectedY = 3;
        layer = fluid::Layer::Pressure;
#elif LAB_CHECKPOINT == 6
        layer = fluid::Layer::Divergence;
#endif
        if (scene != fluid::Scene::TwinJets) {
            parameters.emit = false;
            parameters.buoyancy = 0;
        }
    }

    void pause() {
        paused = true;
        accumulator = 0;
    }

    void rebuild(int n, fluid::Scene next) {
        pause();
        grid = fluid::makeScene(n, next);
        scene = next;
        selectedX = n / 2;
        selectedY = n / 2;
        if (next == fluid::Scene::JacobiPair) {
            selectedX = n / 2 - 1;
            selectedY = n / 2 - 1;
        }
        dragging = false;
        previousValid = false;
        updated = 0;
        dropped = 0;
        reference = "NOT RUN";
        error.clear();
    }

#if LAB_CHECKPOINT >= 3
    bool singleStep() {
        try {
            if (fluid::step(grid, parameters, scene)) {
                updated = grid.density.size();
                return true;
            }
        } catch (const std::exception& problem) {
            // Giữ cửa sổ để người dùng đọc lỗi hoặc reset, không lặp lại tick đang hỏng.
            pause();
            error = problem.what();
            return false;
        }
        pause();
        error = "INVALID STATE / PARAMETERS";
        return false;
    }
#endif

#if LAB_CHECKPOINT >= 10
    // [snippet advance]
    void advance(double elapsed) {
        if (paused) {
            return;
        }
        const auto plan = fluid::planSteps(accumulator, elapsed);
        accumulator = plan.remainder;
        dropped += plan.dropped;
        const auto started = std::chrono::steady_clock::now();
        int completed = 0;
        for (int i = 0; i < plan.steps; ++i) {
            if (!singleStep()) {
                break;
            }
            ++completed;
            if (std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - started).count() >= 12) {
                break;
            }
        }
        dropped += (plan.steps - completed) * fluid::fixedDt;
    }

    // [/snippet advance]
#endif
};
} // namespace smoke
