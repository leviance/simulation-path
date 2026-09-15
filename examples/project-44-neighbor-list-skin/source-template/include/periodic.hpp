#pragma once

#include <cmath>
#include <limits>
#include <vector>

namespace pbc {

// Mọi tọa độ ở đây đều là world space, không phải pixel hay bán kính vẽ.
struct Vec2 {
    double x{};
    double y{};
};

struct Box {
    double width{12.0};
    double height{12.0};
};

struct Particle {
    Vec2 position;
    Vec2 velocity;
    double mass{1.0};
    Vec2 unwrapped;
};

inline Vec2 add(Vec2 a, Vec2 b) {
    return {a.x + b.x, a.y + b.y};
}

inline Vec2 subtract(Vec2 a, Vec2 b) {
    return {a.x - b.x, a.y - b.y};
}

inline Vec2 scale(Vec2 value, double factor) {
    return {value.x * factor, value.y * factor};
}

inline double length(Vec2 value) {
    return std::hypot(value.x, value.y);
}

inline bool finite(Vec2 value) {
    return std::isfinite(value.x) && std::isfinite(value.y);
}

inline bool validBox(Box box) {
    return std::isfinite(box.width) && std::isfinite(box.height) && box.width > 0.0 && box.height > 0.0;
}

// floor xử lý cả tọa độ âm và việc đi qua nhiều ô trong một bước.
inline double wrapCoordinate(double value, double boxLength) {
    if (!std::isfinite(value) || !std::isfinite(boxLength) || boxLength <= 0.0) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    double wrapped = value - boxLength * std::floor(value / boxLength);
    // Sai số làm tròn có thể cho đúng L khi value rất gần 0 từ phía âm.
    if (wrapped >= boxLength) {
        wrapped = 0.0;
    }
    if (wrapped == 0.0) {
        return 0.0;
    }
    return wrapped;
}

inline Vec2 wrapPosition(Vec2 position, Box box) {
    return {wrapCoordinate(position.x, box.width), wrapCoordinate(position.y, box.height)};
}

inline void ballisticStep(Particle& particle, Box box, double dt) {
    const Vec2 displacement = scale(particle.velocity, dt);
    particle.position = wrapPosition(add(particle.position, displacement), box);
    particle.unwrapped = add(particle.unwrapped, displacement);
}

// Chỉ dùng vector ngắn nhất để tính tương tác, không dùng nó để đo quãng đường đã đi.
inline double minimumComponent(double delta, double boxLength) {
    return wrapCoordinate(delta + 0.5 * boxLength, boxLength) - 0.5 * boxLength;
}

inline Vec2 minimumImage(Vec2 delta, Box box) {
    return {minimumComponent(delta.x, box.width), minimumComponent(delta.y, box.height)};
}

// Đây là vị trí để vẽ lại cùng một hạt, không phải chín hạt đưa vào solver.
inline std::vector<Vec2> imagePositions(Vec2 position, Box box) {
    std::vector<Vec2> images;
    for (int imageY = -1; imageY <= 1; ++imageY) {
        for (int imageX = -1; imageX <= 1; ++imageX) {
            images.push_back({position.x + imageX * box.width, position.y + imageY * box.height});
        }
    }
    return images;
}

} // namespace pbc
