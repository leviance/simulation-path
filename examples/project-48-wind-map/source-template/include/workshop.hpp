#pragma once
#include "view.hpp"
#include <string>

namespace wind {
inline Field startingField() {
#if LAB_CHECKPOINT >= 7
    return Field(65, 49);
#else
    return Field(33, 25);
#endif
}

struct Workshop {
    Field field = startingField();
    Layer layer = initialLayer();
    bool clean = false;
    bool running = true;
    bool dragging = false;
    bool editVortex = false;
    int cursorX = field.width / 2;
    int cursorY = field.height / 2;
#if LAB_CHECKPOINT >= 2
    Scene scene = initialScene();
#endif
#if LAB_CHECKPOINT >= 7
    std::vector<Particle> particles = makeParticles();
    bool paused = true;
    bool tracers = true;
    double accumulator = 0;
    double dropped = 0;
    std::uint64_t tick = 0;
    std::size_t visitedLastStep = 0;
#endif
#if LAB_CHECKPOINT >= 9
    std::string report = "NOT RUN";
#endif

    Workshop() {
#if LAB_CHECKPOINT >= 2
        populate(field, scene);
#endif
    }

    void pause() {
#if LAB_CHECKPOINT >= 7
        paused = true;
        accumulator = 0;
#endif
    }

#if LAB_CHECKPOINT >= 2
    // [snippet rebuild]
    void rebuild() {
        // Đổi dữ liệu gió là bắt đầu một thí nghiệm mới; đổi overlay không gọi hàm này.
        populate(field, scene);
#if LAB_CHECKPOINT >= 7
        pause();
        particles = makeParticles();
        tick = 0;
        visitedLastStep = 0;
        dropped = 0;
#endif
#if LAB_CHECKPOINT >= 9
        report = "NOT RUN";
#endif
    }

    // [/snippet rebuild]
#endif

#if LAB_CHECKPOINT >= 7
    // [snippet advance-workshop]
    void step() {
        if (!tracers) {
            return;
        }
        advanceParticles(field, particles);
        visitedLastStep = particles.size();
        ++tick;
    }

    void advance(double elapsed) {
        if (paused || !tracers) {
            return;
        }
        const auto plan = planSteps(accumulator, elapsed);
        accumulator = plan.remainder;
        dropped += plan.dropped;
        for (int i = 0; i < plan.steps; ++i) {
            step();
        }
    }

    // [/snippet advance-workshop]
#endif
};
} // namespace wind
