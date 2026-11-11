#pragma once

#include "morph_mesh.hpp"

namespace morph {

constexpr std::size_t histogramBins = 16;
enum class Sampling { area,
                      triangleBiased };

inline double triangleArea(Vec3 a, Vec3 b, Vec3 c) {
    return 0.5 * length(cross(b - a, c - a));
}

// Two independent uniforms become three non-negative weights whose sum is one.
inline std::array<double, 3> barycentric(double u, double v) {
    if (!std::isfinite(u) || !std::isfinite(v) || u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0)
        throw std::invalid_argument("Barycentric random inputs must lie in [0,1]");
    const double root = std::sqrt(u);
    return {1.0 - root, root * (1.0 - v), root * v};
}

struct SurfacePoint {
    Vec3 position;
    std::uint32_t triangle{};
    std::size_t bin{};
};

class AreaDistribution {
    public:
    explicit AreaDistribution(const Mesh &mesh) {
        if (mesh.triangles.empty() || mesh.triangles.size() > 20000)
            throw std::invalid_argument("A distribution needs a bounded non-empty triangle mesh");
        triangleBins_.resize(mesh.triangles.size());
        for (std::size_t index = 0; index < mesh.triangles.size(); ++index) {
            const auto &triangle = mesh.triangles[index];
            for (const auto vertex : triangle) {
                if (vertex >= mesh.vertices.size() || !finite(mesh.vertices[vertex]))
                    throw std::invalid_argument("Mesh contains an invalid vertex or index");
            }
            const double area = triangleArea(mesh.vertices[triangle[0]], mesh.vertices[triangle[1]], mesh.vertices[triangle[2]]);
            if (!std::isfinite(area))
                throw std::invalid_argument("Triangle area is non-finite");
            if (area <= 1e-12)
                continue;
            total_ += area;
            triangles_.push_back(static_cast<std::uint32_t>(index));
            cumulative_.push_back(total_);
            const double centroidY = (mesh.vertices[triangle[0]].y + mesh.vertices[triangle[1]].y + mesh.vertices[triangle[2]].y) / 3.0;
            const double band = std::floor((centroidY + 2.2) / 4.4 * static_cast<double>(histogramBins));
            const auto bin = static_cast<std::size_t>(std::clamp(band, 0.0, static_cast<double>(histogramBins - 1)));
            triangleBins_[index] = bin;
            binArea_[bin] += area;
        }
        if (total_ <= 0.0 || !std::isfinite(total_))
            throw std::invalid_argument("Mesh has no finite positive surface area");
        for (double &value : binArea_)
            value /= total_;
    }

    std::uint32_t choose(double u, Sampling mode) const {
        if (!std::isfinite(u) || u < 0.0 || u >= 1.0)
            throw std::invalid_argument("Triangle selection expects a uniform in [0,1)");
#if LAB_CHECKPOINT >= 2
        if (mode == Sampling::area) {
            const double threshold = u * total_;
            const auto found = std::upper_bound(cumulative_.begin(), cumulative_.end(), threshold);
            const std::size_t index = static_cast<std::size_t>(found - cumulative_.begin());
            return triangles_[std::min(index, triangles_.size() - 1)];
        }
#else
        (void)mode;
#endif
        // Deliberately biased comparison: every valid triangle receives the same probability.
        const std::size_t index = static_cast<std::size_t>(u * static_cast<double>(triangles_.size()));
        return triangles_[std::min(index, triangles_.size() - 1)];
    }

    SurfacePoint sample(const Mesh &mesh, Random &random, Sampling mode) const {
        const std::uint32_t index = choose(random.uniform(), mode);
        const double u = random.uniform();
        const double v = random.uniform();
        const auto weights = barycentric(u, v);
        const auto &triangle = mesh.triangles[index];
        const Vec3 point = mesh.vertices[triangle[0]] * weights[0] + mesh.vertices[triangle[1]] * weights[1] + mesh.vertices[triangle[2]] * weights[2];
        return {point, index, triangleBins_[index]};
    }
    const std::array<double, histogramBins> &expected() const {
        return binArea_;
    }
    double totalArea() const {
        return total_;
    }

    private:
    std::vector<std::uint32_t> triangles_;
    std::vector<double> cumulative_;
    std::vector<std::size_t> triangleBins_;
    std::array<double, histogramBins> binArea_{};
    double total_{};
};

} // namespace morph
