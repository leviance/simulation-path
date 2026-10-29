#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 11
#endif

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <iterator>
#include <limits>
#include <utility>
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
    double restitution{1.0};
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
    return std::isfinite(ball.position.x) && std::isfinite(ball.position.y) && std::isfinite(ball.velocity.x) && std::isfinite(ball.velocity.y) && std::isfinite(ball.radius) && std::isfinite(ball.inverseMass) && ball.radius > kCollisionEpsilon && ball.inverseMass >= 0.0 && std::isfinite(ball.restitution) && ball.restitution >= 0.0 && ball.restitution <= 1.0;
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
#if LAB_CHECKPOINT >= 1
inline std::vector<Ball> makeBallLattice(int columns, int rows, const TankBounds& bounds, double radius, double speed, std::uint32_t seed) {
    std::vector<Ball> balls{};
    if (columns <= 0 || rows <= 0 || columns > 512 || rows > 512 || columns * rows > 512 || !validBounds(bounds) || !std::isfinite(radius) || radius <= 0.0 || !std::isfinite(speed) || speed < 0.0) {
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

inline std::vector<Ball> makeTankBalls(std::uint32_t seed, bool elastic = false) {
    const TankBounds bounds{-10.0, -6.0, 10.0, 6.0};
    auto balls = makeBallLattice(16, 16, bounds, 0.24, 2.2, seed);
    for (std::size_t index = 0; index < balls.size(); ++index) {
        balls[index].radius = 0.18 + 0.02 * static_cast<double>(index % 4);
        balls[index].inverseMass = 1.0 / (0.5 + 0.25 * static_cast<double>(index % 5));
        if (elastic) {
            balls[index].restitution = 1.0;
        } else {
            balls[index].restitution = 0.7 + 0.15 * static_cast<double>(index % 3);
        }
    }
    return balls;
}
#endif

#if LAB_CHECKPOINT >= 2
// Movement luôn nhận delta time cố định từ accumulator của vòng lặp chính.
inline void integrateBall(Ball& ball, double deltaSeconds) {
    if (!finiteBall(ball) || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return;
    }
    if (ball.inverseMass == 0.0) {
        return;
    }
    const Vec2 next = add(ball.position, scale(ball.velocity, deltaSeconds));
    if (std::isfinite(next.x) && std::isfinite(next.y)) {
        ball.position = next;
    }
}

struct FixedStepPlan {
    int steps{};
    double remainder{};
    double droppedTime{};
};

inline FixedStepPlan planFixedSteps(double accumulator, double frameSeconds, double dt, int maximumSteps, double maximumFrameSeconds) {
    if (!std::isfinite(accumulator) || accumulator < 0.0 || !std::isfinite(frameSeconds) || frameSeconds < 0.0 || !std::isfinite(dt) || dt < 1e-6 || maximumSteps < 1 || maximumSteps > 256 || !std::isfinite(maximumFrameSeconds) || maximumFrameSeconds <= 0.0) {
        return {};
    }
    const double accepted = std::min(frameSeconds, maximumFrameSeconds);
    const double available = accumulator + accepted;
    const double count = std::floor((available + kCollisionEpsilon) / dt);
    if (!std::isfinite(available) || !std::isfinite(count)) {
        return {};
    }
    const int steps = static_cast<int>(std::min(count, static_cast<double>(maximumSteps)));
    const double remainder = std::max(0.0, std::fmod(available + kCollisionEpsilon, dt) - kCollisionEpsilon);
    const double dropped = std::max(0.0, frameSeconds - accepted) + std::max(0.0, available - remainder - static_cast<double>(steps) * dt);
    return {steps, remainder, dropped};
}

#endif

#if LAB_CHECKPOINT >= 3
struct WallCollisionResult {
    int hitCount{};
    double deepestPenetration{};
    Vec2 wallImpulse{};
};

// Wall response sửa position trước, rồi chỉ đảo velocity nếu bóng còn lao ra ngoài.
inline WallCollisionResult resolveWallCollision(Ball& ball, const TankBounds& bounds, double restitution) {
    WallCollisionResult result{};
    if (!finiteBall(ball) || !validBounds(bounds) || !std::isfinite(restitution)) {
        return result;
    }
    if (2.0 * ball.radius > std::min(bounds.maximumX - bounds.minimumX, bounds.maximumY - bounds.minimumY) || ball.inverseMass == 0.0) {
        return result;
    }
    const Vec2 previousVelocity = ball.velocity;
    const double bounce = std::clamp(restitution, 0.0, 1.0) * ball.restitution;

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
    result.wallImpulse = scale(subtract(ball.velocity, previousVelocity), 1.0 / ball.inverseMass);
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
    if (!std::isfinite(distanceSquared) || !std::isfinite(radiusSum) || distanceSquared >= radiusSum * radiusSum) {
        return {};
    }
    if (distanceSquared <= kCollisionEpsilon * kCollisionEpsilon) {
        const Vec2 relativeVelocity = subtract(second.velocity, first.velocity);
        const Vec2 fallbackNormal = normalizedOr(scale(relativeVelocity, -1.0), {1.0, 0.0});
        return {true, fallbackNormal, radiusSum, 0.0};
    }
    const double centerDistance = std::sqrt(distanceSquared);
    const Vec2 normal = scale(centerDelta, 1.0 / centerDistance);
    return {true, normal, radiusSum - centerDistance, centerDistance};
}
#endif

#if LAB_CHECKPOINT >= 5
inline bool validContact(const CircleContact& contact) {
    return contact.colliding && std::isfinite(contact.normal.x) && std::isfinite(contact.normal.y) && std::abs(lengthSquared(contact.normal) - 1.0) < 1e-8 && std::isfinite(contact.penetration) && contact.penetration >= 0.0;
}

inline double normalImpulseMagnitude(double normalSpeed, double inverseMassSum, double restitution) {
    if (!std::isfinite(normalSpeed) || normalSpeed >= 0.0 || !std::isfinite(inverseMassSum) || inverseMassSum <= kCollisionEpsilon || !std::isfinite(restitution)) {
        return 0.0;
    }
    return -(1.0 + std::clamp(restitution, 0.0, 1.0)) * normalSpeed / inverseMassSum;
}

// Impulse chỉ tác động dọc contact normal và bỏ qua cặp đang tách xa nhau.
inline double applyCollisionImpulse(Ball& first, Ball& second, const CircleContact& contact, double restitution) {
    if (!validContact(contact) || !finiteBall(first) || !finiteBall(second) || !std::isfinite(restitution)) {
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
    const double bounce = std::clamp(restitution, 0.0, 1.0) * std::min(first.restitution, second.restitution);
    const double impulseMagnitude = normalImpulseMagnitude(velocityAlongNormal, inverseMassSum, bounce);
    if (!std::isfinite(impulseMagnitude)) {
        return 0.0;
    }
    const Vec2 impulse = scale(contact.normal, impulseMagnitude);
    first.velocity = subtract(first.velocity, scale(impulse, first.inverseMass));
    second.velocity = add(second.velocity, scale(impulse, second.inverseMass));
    return impulseMagnitude;
}
#endif

#if LAB_CHECKPOINT >= 6
// Positional correction tách hai hình tròn mà không bơm thêm năng lượng vào velocity.
inline double correctBallPenetration(Ball& first, Ball& second, const CircleContact& contact, double correctionPercent, double penetrationSlop) {
    if (!validContact(contact) || !finiteBall(first) || !finiteBall(second) || !std::isfinite(correctionPercent) || !std::isfinite(penetrationSlop)) {
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

struct DebugContact {
    Vec2 point{};
    Vec2 normal{1.0, 0.0};
    double penetration = 0.0;
    double impulse = 0.0;
};

struct CollisionStepStats {
    std::size_t pairChecks{};
    std::size_t contacts{};
    std::size_t impulses{};
    std::size_t wallHits{};
    double maximumPenetration{};
    Vec2 wallImpulse{};
    bool valid = true;
    std::vector<DebugContact> debugContacts{};
};

// Brute-force cố ý duyệt mỗi unordered pair đúng một lần trong mỗi solver iteration.
inline CollisionStepStats stepCollisionWorld(std::vector<Ball>& balls, const TankBounds& bounds, const CollisionStepSettings& settings) {
    CollisionStepStats stats{};
    if (!validBounds(bounds) || balls.size() > 512 || !std::isfinite(settings.deltaSeconds) || settings.deltaSeconds <= 0.0 || settings.deltaSeconds > 1.0 / 30.0 || !std::isfinite(settings.restitution) || settings.restitution < 0.0 || settings.restitution > 1.0 || settings.solverIterations < 1 || settings.solverIterations > 8 || !std::isfinite(settings.correctionPercent) || settings.correctionPercent < 0.0 || settings.correctionPercent > 1.0 || !std::isfinite(settings.penetrationSlop) || settings.penetrationSlop < 0.0) {
        stats.valid = false;
        return stats;
    }
    for (const auto& ball : balls) {
        if (!finiteBall(ball) || 2.0 * ball.radius > std::min(bounds.maximumX - bounds.minimumX, bounds.maximumY - bounds.minimumY)) {
            stats.valid = false;
            return stats;
        }
    }
    for (Ball& ball : balls) {
        integrateBall(ball, settings.deltaSeconds);
    }

    const int iterations = std::clamp(settings.solverIterations, 1, 8);
    for (int iteration = 0; iteration < iterations; ++iteration) {
        for (Ball& ball : balls) {
            const WallCollisionResult wall = resolveWallCollision(ball, bounds, settings.restitution);
            stats.wallHits += std::size_t(wall.hitCount);
            stats.wallImpulse = add(stats.wallImpulse, wall.wallImpulse);
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
                if (iteration == 0 && stats.debugContacts.size() < 48) {
                    const Vec2 point = add(balls[firstIndex].position, scale(pair.contact.normal, balls[firstIndex].radius));
                    stats.debugContacts.push_back({point, pair.contact.normal, pair.contact.penetration, pair.impulseMagnitude});
                }
                stats.maximumPenetration = std::max(stats.maximumPenetration, pair.contact.penetration);
            }
        }
    }
    // Correction gần tường có thể đẩy tâm ra ngoài. Khóa lại bounds sau lượt cuối.
    for (auto& ball : balls) {
        const auto wall = resolveWallCollision(ball, bounds, settings.restitution);
        stats.wallHits += static_cast<std::size_t>(wall.hitCount);
        stats.wallImpulse = add(stats.wallImpulse, wall.wallImpulse);
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
    if (index >= balls.size() || balls[index].inverseMass == 0.0 || !finiteBall(balls[index]) || !std::isfinite(velocityChange.x) || !std::isfinite(velocityChange.y) || lengthSquared(velocityChange) > 36.0) {
        return false;
    }
    balls[index].velocity = add(balls[index].velocity, velocityChange);
    return true;
}
#endif

} // namespace lab
