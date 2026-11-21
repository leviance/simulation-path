#pragma once
#include "render.hpp"
#include <optional>

namespace lab {
#if LAB_CHECKPOINT >= 8
// [snippet slot-reading]
inline std::optional<ParticleAoS> readSlot(const Simulation& simulation, std::size_t slot) {
    if (slot >= simulation.active) {
        return std::nullopt;
    }
    // Sau khi đổi layout, cùng số slot vẫn chỉ đúng giọt này.
    return simulation.particle(slot);
}
// [/snippet slot-reading]

inline std::size_t findExpiringSlot(const Simulation& simulation) {
    // Một thao tác trên giao diện không nên phải quét một triệu slot.
    const auto count = std::min<std::size_t>(simulation.active, 4096);
    float soonest = std::numeric_limits<float>::infinity();
    std::size_t selected = 0;
    for (std::size_t slot = 0; slot < count; ++slot) {
        const auto drop = simulation.particle(slot);
        const float remaining = drop.lifetime - drop.age;
        if (remaining < soonest) {
            soonest = remaining;
            selected = slot;
        }
    }
    return selected;
}

// Chỉ chọn từ chính tập đã vẽ, kể cả sau khi culling bởi mặt lưới.
inline std::optional<std::size_t> pickDrop(const Simulation& simulation, const Framebuffer& image,
                                           const Camera& camera, double mouseX, double mouseY) {
    const auto basis = viewBasis(camera);
    const auto samples = std::min(simulation.active, displayBudget);
    std::optional<std::size_t> selected;
    double best = 12.0 * 12.0;
    for (std::size_t sample = 0; sample < samples; ++sample) {
        const auto slot = sample * simulation.active / samples;
        const auto drop = simulation.particle(slot);
        const auto p = projectVertex({drop.positionX, drop.positionY, drop.positionZ}, basis, image.width, image.height);
        if (!p.valid || drop.positionY < fountainFloorY || p.x < 0 || p.y < 0 || p.x >= image.width || p.y >= image.height) continue;
        const double dx = p.x - mouseX, dy = p.y - mouseY;
        const double distance = dx * dx + dy * dy;
        if (distance < best) {
            selected = slot;
            best = distance;
        }
    }
    return selected;
}
#endif
} // namespace lab
