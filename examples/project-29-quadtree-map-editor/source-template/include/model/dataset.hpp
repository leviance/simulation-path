#pragma once
// ID là danh tính ổn định. Hình vẽ và index cùng đọc AABB có kích thước thật.
#include "geometry.hpp"
#include <vector>

namespace maplab {
enum class Kind {
    House,
    Tree,
    Park
};
enum class Layout { Districts,
                    Clustered,
                    Large };
inline constexpr std::size_t maximumObjects = 150000;

struct Object {
    std::uint32_t id{};
    Kind kind = Kind::House;
    Box box{};
};

inline Camera initialCamera(std::size_t count, Layout layout) {
    if (layout == Layout::Clustered) {
        return {-5100, -5100, 0.5};
    }
    const double rows = std::ceil(static_cast<double>(std::max(std::size_t{1}, count)) / 400.0);
    return {0, -12000 + rows * 32, 0.5};
}

inline void validateObject(const Object& object, const Box& root) {
    const bool knownKind = object.kind == Kind::House || object.kind == Kind::Tree || object.kind == Kind::Park;
    if (!knownKind || !validBox(object.box) || !contains(root, object.box)) {
        throw std::invalid_argument("Invalid object or object outside root");
    }
}

class Random {
    public:
    explicit Random(std::uint32_t seed)
        : state_(seed) {
        if (state_ == 0) {
            state_ = 0x6d2b79f5U;
        }
    }

    double unit() {
        state_ ^= state_ << 13U;
        state_ ^= state_ >> 17U;
        state_ ^= state_ << 5U;
        return static_cast<double>(state_) / 4294967296.0;
    }

    private:
    std::uint32_t state_{};
};

// [snippet:makeObjects]
inline std::vector<Object> makeObjects(std::size_t count, std::uint32_t seed, Layout layout) {
    if (count > maximumObjects) {
        throw std::invalid_argument("Map object budget exceeded");
    }
    std::vector<Object> result;
    result.reserve(count);
#if LAB_CHECKPOINT >= 1
    Random random{seed};
    for (std::size_t index = 0; index < count; ++index) {
        const auto id = static_cast<std::uint32_t>(index);
        const auto column = id % 400U;
        const auto row = id / 400U;
        Kind kind = Kind::House;
        if (id % 11U == 0) {
            kind = Kind::Park;
        } else if (id % 3U == 0) {
            kind = Kind::Tree;
        }
        double width = 16 + random.unit() * 32;
        double height = 16 + random.unit() * 28;
        double x = -12800 + column * 64.0 + 6 + random.unit() * 6;
        double y = -12000 + row * 64.0 + 6 + random.unit() * 6;
        if (kind == Kind::Tree) {
            width = 14 + random.unit() * 8;
            height = width;
        }
        if (kind == Kind::Park) {
            width = 44;
            height = 44;
        }
        if (layout == Layout::Clustered) {
            const auto cluster = id % 4U;
            x = -6000 + (cluster % 2U) * 10000.0 + random.unit() * 1800;
            y = -6000 + (cluster / 2U) * 10000.0 + random.unit() * 1800;
        }
        if (layout == Layout::Large && id % 20U == 0) {
            width = 512 + random.unit() * 1536;
            height = 256 + random.unit() * 768;
            x = -15000 + random.unit() * (30000 - width);
            y = -15000 + random.unit() * (30000 - height);
        }
        const Object object{id, kind, {x, y, width, height}};
        validateObject(object, worldRoot);
        result.push_back(object);
    }
#else
    static_cast<void>(seed);
    static_cast<void>(layout);
#endif
    return result;
}

// [/snippet:makeObjects]
} // namespace maplab
