#include "sculpt_tetra.hpp"
#include <bit>
#include <iostream>

namespace {
using namespace sculpt;

void requireTetra(bool correct, const char* message) {
    if (!correct)
        throw std::runtime_error(message);
}
} // namespace

void testTetraPreview() {
    using namespace sculpt;
    const float maximum = std::numeric_limits<float>::max();
    int rejectedOverflow = 0;
    try {
        edgePoint({0, {0, 0, 0}, -maximum}, {1, {1, 0, 0}, maximum}, 0);
    } catch (const std::exception&) {
        ++rejectedOverflow;
    }
    try {
        edgePoint({0, {-maximum, 0, 0}, -1}, {1, {maximum, 0, 0}, 1}, 0);
    } catch (const std::exception&) {
        ++rejectedOverflow;
    }
    requireTetra(rejectedOverflow == 2, "Finite input overflow silently produced an incorrect edge position");
    for (unsigned mask = 0; mask < 16; ++mask) {
        auto corners = teachingTetra();
        for (unsigned corner = 0; corner < 4; ++corner) {
            corners[corner].value = 1;
            if ((mask & (1U << corner)) != 0)
                corners[corner].value = -1;
        }
        const int inside = std::popcount(mask);
        std::size_t expectedVertices = 0;
        if (inside == 1 || inside == 3)
            expectedVertices = 3;
        else if (inside == 2)
            expectedVertices = 6;

        // Solve the affine gradient independently of polygonizeTetra's orientation policy.
        const auto a = corners[1].point - corners[0].point;
        const auto b = corners[2].point - corners[0].point;
        const auto c = corners[3].point - corners[0].point;
        const auto determinant = dot(a, cross(b, c));
        const auto gradient = (cross(b, c) * (corners[1].value - corners[0].value) + cross(c, a) * (corners[2].value - corners[0].value) + cross(a, b) * (corners[3].value - corners[0].value)) / determinant;
        for (const float isovalue : {-0.4F, 0.0F, 0.4F}) {
            const auto vertices = tetraSurface(corners, isovalue);
            requireTetra(vertices.size() == expectedVertices, "Teaching app uploaded an incorrect tetra triangle count");
            for (const auto& vertex : vertices) {
                const auto point = positionOf(vertex);
                const auto normal = normalOf(vertex);
                requireTetra(finite(point) && finite(normal) && std::abs(length(normal) - 1) < 0.000002F && dot(normal, gradient) > 0, "Teaching tetra normal is not finite, unit and outward");
                bool matchesIndependentEdge = false;
                for (int first = 0; first < 4; ++first)
                    for (int second = first + 1; second < 4; ++second) {
                        if ((corners[first].value < isovalue) == (corners[second].value < isovalue))
                            continue;
                        const double t = (static_cast<double>(isovalue) - corners[first].value) / (static_cast<double>(corners[second].value) - corners[first].value);
                        const auto from = corners[first].point;
                        const auto to = corners[second].point;
                        const double dx = point.x - (from.x + t * (to.x - from.x));
                        const double dy = point.y - (from.y + t * (to.y - from.y));
                        const double dz = point.z - (from.z + t * (to.z - from.z));
                        if (std::sqrt(dx * dx + dy * dy + dz * dz) < 0.000001)
                            matchesIndependentEdge = true;
                    }
                requireTetra(matchesIndependentEdge, "Teaching app vertex does not lie at an independently computed edge crossing");
            }
        }
    }
    std::cout << "TETRA TEACHING SURFACE PASS masks=16 isovalues=3 doubleEdgeReference=1 affineNormalReference=1 overflowRejected=2\n";
}
