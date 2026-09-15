#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>
#include <vector>

namespace {

int failures = 0;

bool closeEnough(double actual, double expected, double tolerance = 1e-9) {
    return std::abs(actual - expected) <= tolerance;
}

// Dùng phép kiểm tường minh để Debug và Release cùng chạy toàn bộ validation.
void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    std::cerr << "FAILED: " << label << '\n';
    ++failures;
}

bool sameBall(const lab::Ball& first, const lab::Ball& second) {
    return closeEnough(first.position.x, second.position.x) && closeEnough(first.position.y, second.position.y) && closeEnough(first.velocity.x, second.velocity.x) && closeEnough(first.velocity.y, second.velocity.y) && closeEnough(first.radius, second.radius) && closeEnough(first.inverseMass, second.inverseMass) && first.color == second.color;
}

} // namespace

int main() {
    failures = 0;
    const lab::TankBounds bounds{0.0, 0.0, 16.0, 10.0};

    check(closeEnough(lab::dot({1.0, 2.0}, {3.0, 4.0}), 11.0), "Vec2 dot product is correct");
    check(closeEnough(lab::length({3.0, 4.0}), 5.0), "Vec2 length is correct");
    const lab::Vec2 fallback = lab::normalizedOr({0.0, 0.0}, {1.0, 0.0});
    check(closeEnough(fallback.x, 1.0) && closeEnough(fallback.y, 0.0), "zero vector uses the requested normal fallback");

    const std::vector<lab::Ball> firstScene = lab::makeBallLattice(16, 9, bounds, 0.24, 2.2, 0x00c0ffeeU);
    const std::vector<lab::Ball> secondScene = lab::makeBallLattice(16, 9, bounds, 0.24, 2.2, 0x00c0ffeeU);
    check(firstScene.size() == 144, "default lattice contains 144 balls");
    check(secondScene.size() == firstScene.size(), "same seed creates the same body count");
    for (std::size_t index = 0; index < firstScene.size(); ++index) {
        check(sameBall(firstScene[index], secondScene[index]), "same seed reproduces every ball state");
        check(firstScene[index].position.x - firstScene[index].radius >= bounds.minimumX, "spawned ball stays inside the left wall");
        check(firstScene[index].position.x + firstScene[index].radius <= bounds.maximumX, "spawned ball stays inside the right wall");
        check(firstScene[index].position.y - firstScene[index].radius >= bounds.minimumY, "spawned ball stays inside the bottom wall");
        check(firstScene[index].position.y + firstScene[index].radius <= bounds.maximumY, "spawned ball stays inside the top wall");
    }
    check(lab::measureWorld(firstScene).overlapCount == 0, "default lattice starts without overlap");

    lab::Ball moving{{1.0, 2.0}, {3.0, -4.0}, 0.25, 1.0, 0xffffffffU};
    lab::integrateBall(moving, 0.5);
    check(closeEnough(moving.position.x, 2.5) && closeEnough(moving.position.y, 0.0), "integration advances position by velocity times dt");

    int fastFrameSteps = 0;
    double fastRemainder = 0.0;
    for (int frame = 0; frame < 120; ++frame) {
        const lab::FixedStepPlan plan = lab::planFixedSteps(fastRemainder, 1.0 / 120.0, 1.0 / 60.0, 16, 0.25);
        fastFrameSteps += plan.steps;
        fastRemainder = plan.remainder;
    }
    int slowFrameSteps = 0;
    double slowRemainder = 0.0;
    for (int frame = 0; frame < 30; ++frame) {
        const lab::FixedStepPlan plan = lab::planFixedSteps(slowRemainder, 1.0 / 30.0, 1.0 / 60.0, 16, 0.25);
        slowFrameSteps += plan.steps;
        slowRemainder = plan.remainder;
    }
    check(fastFrameSteps == 60 && slowFrameSteps == 60, "frame splits produce the same fixed-step count");

    lab::Ball wallBall{{-0.1, 9.9}, {-3.0, 2.0}, 0.25, 1.0, 0xffffffffU};
    const lab::WallCollisionResult wall = lab::resolveWallCollision(wallBall, bounds, 0.5);
    check(wall.hitCount == 2, "a corner penetration reports two wall contacts");
    check(closeEnough(wallBall.position.x, 0.25) && closeEnough(wallBall.position.y, 9.75), "wall collision places the center one radius from both walls");
    check(closeEnough(wallBall.velocity.x, 1.5) && closeEnough(wallBall.velocity.y, -1.0), "wall collision applies restitution to incoming components");
    lab::Ball leavingWall{{0.1, 5.0}, {2.0, 0.0}, 0.25, 1.0, 0xffffffffU};
    lab::resolveWallCollision(leavingWall, bounds, 1.0);
    check(closeEnough(leavingWall.velocity.x, 2.0), "wall correction does not flip a ball already moving inward");

    const lab::Ball contactFirst{{2.0, 3.0}, {1.0, 0.0}, 0.5, 1.0, 0xffffffffU};
    const lab::Ball contactSecond{{2.8, 3.0}, {-1.0, 0.0}, 0.5, 1.0, 0xffffffffU};
    const lab::CircleContact contact = lab::findCircleContact(contactFirst, contactSecond);
    check(contact.colliding, "overlapping circles produce a contact");
    check(closeEnough(contact.normal.x, 1.0) && closeEnough(contact.normal.y, 0.0), "contact normal points from A to B");
    check(closeEnough(contact.penetration, 0.2), "contact penetration equals radius sum minus center distance");
    const lab::CircleContact separate = lab::findCircleContact(contactFirst, {{3.1, 3.0}, {}, 0.5, 1.0, 0xffffffffU});
    check(!separate.colliding, "separated circles do not create a contact");
    const lab::CircleContact coincident = lab::findCircleContact(contactFirst, {{2.0, 3.0}, {-1.0, 0.0}, 0.5, 1.0, 0xffffffffU});
    check(coincident.colliding && closeEnough(lab::length(coincident.normal), 1.0), "coincident centers receive a finite unit fallback normal");

    lab::Ball impulseFirst = contactFirst;
    lab::Ball impulseSecond = contactSecond;
    const lab::Vec2 momentumBefore = lab::add(impulseFirst.velocity, impulseSecond.velocity);
    const double energyBefore = 0.5 * lab::lengthSquared(impulseFirst.velocity) + 0.5 * lab::lengthSquared(impulseSecond.velocity);
    const double impulseMagnitude = lab::applyCollisionImpulse(impulseFirst, impulseSecond, contact, 1.0);
    const lab::Vec2 momentumAfter = lab::add(impulseFirst.velocity, impulseSecond.velocity);
    const double energyAfter = 0.5 * lab::lengthSquared(impulseFirst.velocity) + 0.5 * lab::lengthSquared(impulseSecond.velocity);
    check(closeEnough(impulseMagnitude, 2.0), "elastic equal-mass head-on collision has the expected impulse");
    check(closeEnough(impulseFirst.velocity.x, -1.0) && closeEnough(impulseSecond.velocity.x, 1.0), "elastic equal masses exchange normal velocity");
    check(closeEnough(momentumBefore.x, momentumAfter.x) && closeEnough(momentumBefore.y, momentumAfter.y), "pair impulse conserves linear momentum");
    check(closeEnough(energyBefore, energyAfter), "restitution one conserves pair kinetic energy");
    const lab::CircleContact separatingContact = lab::findCircleContact(impulseFirst, impulseSecond);
    check(closeEnough(lab::applyCollisionImpulse(impulseFirst, impulseSecond, separatingContact, 1.0), 0.0), "separating balls receive no second impulse");

    lab::Ball correctionFirst = contactFirst;
    lab::Ball correctionSecond = contactSecond;
    const lab::Vec2 firstVelocityBeforeCorrection = correctionFirst.velocity;
    const double correctionMagnitude = lab::correctBallPenetration(correctionFirst, correctionSecond, contact, 1.0, 0.0);
    const lab::CircleContact afterCorrection = lab::findCircleContact(correctionFirst, correctionSecond);
    check(correctionMagnitude > 0.0, "positional correction reports a displacement");
    check(!afterCorrection.colliding || afterCorrection.penetration < 1e-9, "full correction removes pair penetration");
    check(closeEnough(correctionFirst.velocity.x, firstVelocityBeforeCorrection.x) && closeEnough(correctionFirst.velocity.y, firstVelocityBeforeCorrection.y), "positional correction does not change velocity");

    std::vector<lab::Ball> fourBalls = lab::makeBallLattice(2, 2, {0.0, 0.0, 4.0, 4.0}, 0.25, 0.0, 7U);
    const lab::CollisionStepSettings countSettings{1.0 / 120.0, 1.0, 3, 0.8, 0.001};
    const lab::CollisionStepStats countStats = lab::stepCollisionWorld(fourBalls, {0.0, 0.0, 4.0, 4.0}, countSettings);
    check(countStats.pairChecks == 18, "three iterations over four balls check 3*N*(N-1)/2 pairs");

    std::vector<lab::Ball> stressBalls = firstScene;
    const double stressInitialEnergy = lab::measureWorld(stressBalls).kineticEnergy;
    const lab::CollisionStepSettings stressSettings{1.0 / 120.0, 1.0, 3, 0.8, 0.001};
    for (int step = 0; step < 240; ++step) {
        const lab::CollisionStepStats stats = lab::stepCollisionWorld(stressBalls, bounds, stressSettings);
        check(stats.pairChecks == 3U * 144U * 143U / 2U, "stress step keeps the exact brute-force pair count");
    }
    const lab::WorldMetrics stressMetrics = lab::measureWorld(stressBalls);
    check(stressMetrics.finite, "stress run keeps every body finite");
    check(stressMetrics.maximumPenetration < 0.02, "stress run keeps maximum penetration bounded");
    check(std::abs(stressMetrics.kineticEnergy - stressInitialEnergy) / stressInitialEnergy < 1e-8, "elastic stress run preserves kinetic energy");
    for (const lab::Ball& ball : stressBalls) {
        check(ball.position.x - ball.radius >= bounds.minimumX - 1e-9, "stress ball stays inside the left wall");
        check(ball.position.x + ball.radius <= bounds.maximumX + 1e-9, "stress ball stays inside the right wall");
        check(ball.position.y - ball.radius >= bounds.minimumY - 1e-9, "stress ball stays inside the bottom wall");
        check(ball.position.y + ball.radius <= bounds.maximumY + 1e-9, "stress ball stays inside the top wall");
    }

    std::vector<lab::Ball> kickBalls = firstScene;
    const std::size_t nearest = lab::nearestBallIndex(kickBalls, kickBalls[12].position);
    check(nearest == 12, "nearest-ball query finds an exact center");
    const lab::Vec2 velocityBeforeKick = kickBalls[nearest].velocity;
    check(lab::applyVelocityKick(kickBalls, nearest, {1.0, -2.0}), "valid velocity kick is applied");
    check(closeEnough(kickBalls[nearest].velocity.x, velocityBeforeKick.x + 1.0) && closeEnough(kickBalls[nearest].velocity.y, velocityBeforeKick.y - 2.0), "velocity kick adds the requested delta");

    if (failures != 0) {
        std::cerr << failures << " Project 24 validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 24 validation passed\n";
    return EXIT_SUCCESS;
}
