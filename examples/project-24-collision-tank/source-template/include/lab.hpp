#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

#if LAB_CHECKPOINT >= 1
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <vector>

namespace lab {

// Các phép toán Vec2 nhỏ được viết tường minh để công thức collision bên dưới
// có thể đọc theo đúng thứ tự của phần giải thích trong bài học.
inline constexpr double kCollisionEpsilon = 1e-12;
inline constexpr double kPi = 3.14159265358979323846;

struct Vec2 {
    double x{};
    double y{};
};

inline Vec2 add(Vec2 left, Vec2 right) {
    return {left.x + right.x, left.y + right.y};
}

inline Vec2 subtract(Vec2 left, Vec2 right) {
    return {left.x - right.x, left.y - right.y};
}

inline Vec2 scale(Vec2 value, double factor) {
    return {value.x * factor, value.y * factor};
}

inline double dot(Vec2 left, Vec2 right) {
    return left.x * right.x + left.y * right.y;
}

inline double lengthSquared(Vec2 value) {
    return dot(value, value);
}

inline double length(Vec2 value) {
    return std::sqrt(lengthSquared(value));
}

inline Vec2 normalizedOr(Vec2 value, Vec2 fallback) {
    const double magnitude = length(value);
    if (!std::isfinite(magnitude) || magnitude <= kCollisionEpsilon) {
        return fallback;
    }
    return scale(value, 1.0 / magnitude);
}

struct Ball {
    Vec2 position{};
    Vec2 velocity{};
    double radius{0.2};
    double inverseMass{1.0};
    std::uint32_t color{0xffffffffU};
};

struct TankBounds {
    double minimumX{};
    double minimumY{};
    double maximumX{16.0};
    double maximumY{10.0};
};

inline bool validBounds(const TankBounds& bounds) {
    return std::isfinite(bounds.minimumX) && std::isfinite(bounds.minimumY) && std::isfinite(bounds.maximumX) && std::isfinite(bounds.maximumY) && bounds.maximumX > bounds.minimumX && bounds.maximumY > bounds.minimumY;
}

inline bool finiteBall(const Ball& ball) {
    return std::isfinite(ball.position.x) && std::isfinite(ball.position.y) && std::isfinite(ball.velocity.x) && std::isfinite(ball.velocity.y) && std::isfinite(ball.radius) && std::isfinite(ball.inverseMass) && ball.radius > kCollisionEpsilon && ball.inverseMass >= 0.0;
}

struct SeededRandom {
    std::uint32_t state{1U};

    explicit SeededRandom(std::uint32_t seed) {
        state = seed;
        if (state == 0U) {
            state = 1U;
        }
    }

    std::uint32_t nextU32() {
        std::uint32_t value = state;
        value ^= value << 13U;
        value ^= value >> 17U;
        value ^= value << 5U;
        state = value;
        return value;
    }

    double nextUnit() {
        return double(nextU32()) / double(std::numeric_limits<std::uint32_t>::max());
    }
};

// Lattice quyết định vị trí không chồng lấn; PRNG có seed chỉ quyết định vận tốc.
// Nhờ đó mỗi lần reset đều tái hiện chính xác cùng một initial state.
inline std::vector<Ball> makeBallLattice(int columns, int rows, const TankBounds& bounds, double radius, double speed, std::uint32_t seed) {
    std::vector<Ball> balls{};
    if (columns <= 0 || rows <= 0 || !validBounds(bounds) || !std::isfinite(radius) || radius <= 0.0 || !std::isfinite(speed) || speed < 0.0) {
        return balls;
    }
    const double cellWidth = (bounds.maximumX - bounds.minimumX) / double(columns);
    const double cellHeight = (bounds.maximumY - bounds.minimumY) / double(rows);
    if (2.0 * radius > std::min(cellWidth, cellHeight)) {
        return balls;
    }

    constexpr std::uint32_t palette[] = {
        0x61afefffU,
        0x98c379ffU,
        0xe5c07bffU,
        0xc678ddffU,
        0xe06c75ffU,
        0x56b6c2ffU,
    };
    SeededRandom random(seed);
    balls.reserve(std::size_t(columns) * std::size_t(rows));
    for (int row = 0; row < rows; ++row) {
        for (int column = 0; column < columns; ++column) {
            const double positionX = bounds.minimumX + (double(column) + 0.5) * cellWidth;
            const double positionY = bounds.minimumY + (double(row) + 0.5) * cellHeight;
            const double angle = 2.0 * kPi * random.nextUnit();
            const double speedScale = 0.75 + 0.5 * random.nextUnit();
            const Vec2 velocity{speed * speedScale * std::cos(angle), speed * speedScale * std::sin(angle)};
            const std::size_t colorIndex = std::size_t(row * columns + column) % std::size(palette);
            balls.push_back({{positionX, positionY}, velocity, radius, 1.0, palette[colorIndex]});
        }
    }
    return balls;
}

#if LAB_CHECKPOINT >= 2
// Movement luôn nhận delta time cố định từ accumulator của vòng lặp chính.
inline void integrateBall(Ball& ball, double deltaSeconds) {
    if (!finiteBall(ball) || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return;
    }
    ball.position = add(ball.position, scale(ball.velocity, deltaSeconds));
}

struct FixedStepPlan {
    int steps{};
    double remainder{};
    double droppedTime{};
};

inline FixedStepPlan planFixedSteps(double accumulator, double frameSeconds, double fixedDeltaSeconds, int maximumSteps, double maximumFrameSeconds) {
    if (!std::isfinite(accumulator) || accumulator < 0.0 || !std::isfinite(frameSeconds) || frameSeconds < 0.0 || !std::isfinite(fixedDeltaSeconds) || fixedDeltaSeconds <= 0.0 || maximumSteps <= 0 || !std::isfinite(maximumFrameSeconds) || maximumFrameSeconds <= 0.0) {
        return {};
    }
    const double acceptedFrame = std::min(frameSeconds, maximumFrameSeconds);
    double available = accumulator + acceptedFrame;
    const int availableSteps = int(std::floor((available + kCollisionEpsilon) / fixedDeltaSeconds));
    const int steps = std::min(availableSteps, maximumSteps);
    available -= double(steps) * fixedDeltaSeconds;
    double droppedTime = std::max(0.0, frameSeconds - acceptedFrame);
    if (availableSteps > maximumSteps) {
        const int discardedSteps = availableSteps - maximumSteps;
        available -= double(discardedSteps) * fixedDeltaSeconds;
        droppedTime += double(discardedSteps) * fixedDeltaSeconds;
    }
    if (available < 0.0 && available > -kCollisionEpsilon) {
        available = 0.0;
    }
    return {steps, available, droppedTime};
}
#endif

#if LAB_CHECKPOINT >= 3
struct WallCollisionResult {
    int hitCount{};
    double deepestPenetration{};
};

// Wall response sửa position trước, rồi chỉ đảo velocity nếu bóng còn lao ra ngoài.
inline WallCollisionResult resolveWallCollision(Ball& ball, const TankBounds& bounds, double restitution) {
    WallCollisionResult result{};
    if (!finiteBall(ball) || !validBounds(bounds) || !std::isfinite(restitution)) {
        return result;
    }
    const double bounce = std::clamp(restitution, 0.0, 1.0);

    const double leftLimit = bounds.minimumX + ball.radius;
    if (ball.position.x < leftLimit) {
        result.deepestPenetration = std::max(result.deepestPenetration, leftLimit - ball.position.x);
        ball.position.x = leftLimit;
        if (ball.velocity.x < 0.0) {
            ball.velocity.x = -ball.velocity.x * bounce;
        }
        ++result.hitCount;
    }
    const double rightLimit = bounds.maximumX - ball.radius;
    if (ball.position.x > rightLimit) {
        result.deepestPenetration = std::max(result.deepestPenetration, ball.position.x - rightLimit);
        ball.position.x = rightLimit;
        if (ball.velocity.x > 0.0) {
            ball.velocity.x = -ball.velocity.x * bounce;
        }
        ++result.hitCount;
    }
    const double bottomLimit = bounds.minimumY + ball.radius;
    if (ball.position.y < bottomLimit) {
        result.deepestPenetration = std::max(result.deepestPenetration, bottomLimit - ball.position.y);
        ball.position.y = bottomLimit;
        if (ball.velocity.y < 0.0) {
            ball.velocity.y = -ball.velocity.y * bounce;
        }
        ++result.hitCount;
    }
    const double topLimit = bounds.maximumY - ball.radius;
    if (ball.position.y > topLimit) {
        result.deepestPenetration = std::max(result.deepestPenetration, ball.position.y - topLimit);
        ball.position.y = topLimit;
        if (ball.velocity.y > 0.0) {
            ball.velocity.y = -ball.velocity.y * bounce;
        }
        ++result.hitCount;
    }
    return result;
}
#endif

#if LAB_CHECKPOINT >= 4
struct CircleContact {
    bool colliding{};
    Vec2 normal{1.0, 0.0};
    double penetration{};
    double centerDistance{};
};

// Detection chỉ tạo dữ liệu contact; hàm này không thay đổi state của hai bóng.
inline CircleContact findCircleContact(const Ball& first, const Ball& second) {
    if (!finiteBall(first) || !finiteBall(second)) {
        return {};
    }
    const Vec2 centerDelta = subtract(second.position, first.position);
    const double radiusSum = first.radius + second.radius;
    const double distanceSquared = lengthSquared(centerDelta);
    if (distanceSquared >= radiusSum * radiusSum) {
        return {};
    }
    if (distanceSquared <= kCollisionEpsilon * kCollisionEpsilon) {
        const Vec2 relativeVelocity = subtract(second.velocity, first.velocity);
        const Vec2 fallbackNormal = normalizedOr(relativeVelocity, {1.0, 0.0});
        return {true, fallbackNormal, radiusSum, 0.0};
    }
    const double centerDistance = std::sqrt(distanceSquared);
    const Vec2 normal = scale(centerDelta, 1.0 / centerDistance);
    return {true, normal, radiusSum - centerDistance, centerDistance};
}
#endif

#if LAB_CHECKPOINT >= 5
// Impulse chỉ tác động dọc contact normal và bỏ qua cặp đang tách xa nhau.
inline double applyCollisionImpulse(Ball& first, Ball& second, const CircleContact& contact, double restitution) {
    if (!contact.colliding || !finiteBall(first) || !finiteBall(second) || !std::isfinite(restitution)) {
        return 0.0;
    }
    const double inverseMassSum = first.inverseMass + second.inverseMass;
    if (inverseMassSum <= kCollisionEpsilon) {
        return 0.0;
    }
    const Vec2 relativeVelocity = subtract(second.velocity, first.velocity);
    const double velocityAlongNormal = dot(relativeVelocity, contact.normal);
    if (velocityAlongNormal >= 0.0) {
        return 0.0;
    }
    const double bounce = std::clamp(restitution, 0.0, 1.0);
    const double impulseMagnitude = -(1.0 + bounce) * velocityAlongNormal / inverseMassSum;
    const Vec2 impulse = scale(contact.normal, impulseMagnitude);
    first.velocity = subtract(first.velocity, scale(impulse, first.inverseMass));
    second.velocity = add(second.velocity, scale(impulse, second.inverseMass));
    return impulseMagnitude;
}
#endif

#if LAB_CHECKPOINT >= 6
// Positional correction tách hai hình tròn mà không bơm thêm năng lượng vào velocity.
inline double correctBallPenetration(Ball& first, Ball& second, const CircleContact& contact, double correctionPercent, double penetrationSlop) {
    if (!contact.colliding || !finiteBall(first) || !finiteBall(second) || !std::isfinite(correctionPercent) || !std::isfinite(penetrationSlop)) {
        return 0.0;
    }
    const double inverseMassSum = first.inverseMass + second.inverseMass;
    if (inverseMassSum <= kCollisionEpsilon) {
        return 0.0;
    }
    const double safePercent = std::clamp(correctionPercent, 0.0, 1.0);
    const double safeSlop = std::max(0.0, penetrationSlop);
    const double correctionMagnitude = std::max(contact.penetration - safeSlop, 0.0) * safePercent / inverseMassSum;
    const Vec2 correction = scale(contact.normal, correctionMagnitude);
    first.position = subtract(first.position, scale(correction, first.inverseMass));
    second.position = add(second.position, scale(correction, second.inverseMass));
    return correctionMagnitude;
}

struct PairResolutionResult {
    CircleContact contact{};
    double impulseMagnitude{};
    double correctionMagnitude{};
};

inline PairResolutionResult resolveBallPair(Ball& first, Ball& second, double restitution, double correctionPercent, double penetrationSlop) {
    PairResolutionResult result{};
    result.contact = findCircleContact(first, second);
    if (!result.contact.colliding) {
        return result;
    }
    result.impulseMagnitude = applyCollisionImpulse(first, second, result.contact, restitution);
    result.correctionMagnitude = correctBallPenetration(first, second, result.contact, correctionPercent, penetrationSlop);
    return result;
}
#endif

#if LAB_CHECKPOINT >= 7
struct CollisionStepSettings {
    double deltaSeconds{1.0 / 120.0};
    double restitution{0.96};
    int solverIterations{3};
    double correctionPercent{0.8};
    double penetrationSlop{0.001};
};

struct CollisionStepStats {
    std::size_t pairChecks{};
    std::size_t contacts{};
    std::size_t impulses{};
    std::size_t wallHits{};
    double maximumPenetration{};
};

// Brute-force cố ý duyệt mỗi unordered pair đúng một lần trong mỗi solver iteration.
inline CollisionStepStats stepCollisionWorld(std::vector<Ball>& balls, const TankBounds& bounds, const CollisionStepSettings& settings) {
    CollisionStepStats stats{};
    if (!validBounds(bounds) || !std::isfinite(settings.deltaSeconds) || settings.deltaSeconds <= 0.0) {
        return stats;
    }
    for (Ball& ball : balls) {
        integrateBall(ball, settings.deltaSeconds);
    }

    const int iterations = std::clamp(settings.solverIterations, 1, 8);
    for (int iteration = 0; iteration < iterations; ++iteration) {
        for (Ball& ball : balls) {
            const WallCollisionResult wall = resolveWallCollision(ball, bounds, settings.restitution);
            stats.wallHits += std::size_t(wall.hitCount);
            stats.maximumPenetration = std::max(stats.maximumPenetration, wall.deepestPenetration);
        }
        for (std::size_t firstIndex = 0; firstIndex < balls.size(); ++firstIndex) {
            for (std::size_t secondIndex = firstIndex + 1; secondIndex < balls.size(); ++secondIndex) {
                ++stats.pairChecks;
                const PairResolutionResult pair = resolveBallPair(balls[firstIndex], balls[secondIndex], settings.restitution, settings.correctionPercent, settings.penetrationSlop);
                if (!pair.contact.colliding) {
                    continue;
                }
                ++stats.contacts;
                if (pair.impulseMagnitude > 0.0) {
                    ++stats.impulses;
                }
                stats.maximumPenetration = std::max(stats.maximumPenetration, pair.contact.penetration);
            }
        }
    }
    return stats;
}
#endif

#if LAB_CHECKPOINT >= 8
struct WorldMetrics {
    Vec2 totalMomentum{};
    double kineticEnergy{};
    std::size_t overlapCount{};
    double maximumPenetration{};
    bool finite{true};
};

// Metrics được đo độc lập với rendering để tests có thể kiểm tra invariant lâu dài.
inline WorldMetrics measureWorld(const std::vector<Ball>& balls) {
    WorldMetrics metrics{};
    for (const Ball& ball : balls) {
        if (!finiteBall(ball)) {
            metrics.finite = false;
            continue;
        }
        if (ball.inverseMass <= kCollisionEpsilon) {
            continue;
        }
        const double mass = 1.0 / ball.inverseMass;
        metrics.totalMomentum = add(metrics.totalMomentum, scale(ball.velocity, mass));
        metrics.kineticEnergy += 0.5 * mass * lengthSquared(ball.velocity);
    }
    for (std::size_t firstIndex = 0; firstIndex < balls.size(); ++firstIndex) {
        for (std::size_t secondIndex = firstIndex + 1; secondIndex < balls.size(); ++secondIndex) {
            const CircleContact contact = findCircleContact(balls[firstIndex], balls[secondIndex]);
            if (!contact.colliding) {
                continue;
            }
            ++metrics.overlapCount;
            metrics.maximumPenetration = std::max(metrics.maximumPenetration, contact.penetration);
        }
    }
    return metrics;
}

inline std::size_t nearestBallIndex(const std::vector<Ball>& balls, Vec2 point) {
    if (balls.empty()) {
        return balls.size();
    }
    std::size_t nearestIndex = 0;
    double nearestDistanceSquared = lengthSquared(subtract(balls[0].position, point));
    for (std::size_t index = 1; index < balls.size(); ++index) {
        const double distanceSquared = lengthSquared(subtract(balls[index].position, point));
        if (distanceSquared < nearestDistanceSquared) {
            nearestDistanceSquared = distanceSquared;
            nearestIndex = index;
        }
    }
    return nearestIndex;
}

inline bool applyVelocityKick(std::vector<Ball>& balls, std::size_t index, Vec2 velocityChange) {
    if (index >= balls.size() || !std::isfinite(velocityChange.x) || !std::isfinite(velocityChange.y)) {
        return false;
    }
    balls[index].velocity = add(balls[index].velocity, velocityChange);
    return true;
}
#endif

} // namespace lab
#endif
