#include "sculpt_grid_guides.hpp"
#include <iostream>

namespace {
using namespace sculpt;

void samePoint(const LineVertex& actual, Vec3 expected) {
    const Vec3 point{actual.position[0], actual.position[1], actual.position[2]};
    if (!finite(point) || length(point - expected) > 0.000002F)
        throw std::runtime_error("Viewport grid does not follow the document domain");
}
} // namespace

void testGridGuides() {
    const auto original = gridGuideLines(GridSpec{});
    samePoint(original[0], {-1.5F, -1.1F, -1.5F});
    samePoint(original[1], {-1.5F, -1.1F, 1.5F});
    samePoint(original[84], {0, -1.1F, 0});
    samePoint(original[85], {1.6F, -1.1F, 0});
    samePoint(original[87], {0, -1.1F, 1.6F});
    GridSpec moved{128, {2, -0.5F, 3}, 1.5F};
    const auto translated = gridGuideLines(moved);
    for (std::size_t index = 0; index < original.size(); ++index) {
        const Vec3 oldPoint{original[index].position[0], original[index].position[1], original[index].position[2]};
        samePoint(translated[index], moved.origin + (oldPoint - Vec3{-1.5F, -1.5F, -1.5F}) * 0.5F);
        if (original[index].color != translated[index].color)
            throw std::runtime_error("Grid relocation changed guide colors");
    }
    bool rejected = false;
    try {
        gridGuideLines(GridSpec{32, {}, 0});
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    if (!rejected)
        throw std::runtime_error("Guide decoration accepted an invalid grid extent");
    std::cout << "GRID GUIDES PASS vertices=88 defaultDomain=1 translatedScaledDomain=1 invalidDomainRejected=1\n";
}
